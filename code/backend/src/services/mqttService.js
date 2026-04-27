import mqtt from 'mqtt';
import prisma from '../lib/prisma.js';
import { Point } from '@influxdata/influxdb-client';
import { writeApi } from '../lib/influx.js';
import { sendAlertEmail } from './emailService.js';
import { io } from '../index.js';

let mqttClient = null;

// Sensor type → [mongoField, influxField]
const SENSOR_MAP = {
    temperature: ['lastTemp', 'temperature'],
    ph:          ['lastPh', 'pH'],
    tds:         ['lastTds', 'tds'],
    turbidity:   ['lastTurb', 'turbidity'],
    waterlevel:  ['lastWaterLevel', 'waterLevel'],
};

export const initMqtt = () => {
    // Disconnect any previous client (handles nodemon restarts on Windows)
    if (mqttClient) {
        mqttClient.end(true);
        mqttClient = null;
    }

    const brokerUrl = process.env.MQTT_BROKER_URL;
    
    const client = mqtt.connect(brokerUrl, {
        username: process.env.MQTT_USERNAME || process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD,
        clientId: `GUARD_Backend_${Math.random().toString(16).slice(2, 8)}`, // Unique ID to prevent conflict
        clean: true,                      // discard any stale subscriptions
        rejectUnauthorized: true,
    });
    mqttClient = client;

    client.on('connect', () => {
        console.log(`☁️  MQTT connected to ${brokerUrl}`);
        // Subscribe at QoS 1 so the broker tracks delivery and won't re-send duplicates
        client.subscribe({ 
            'sensor/+/+': { qos: 1 }, 
            'alert/+/+': { qos: 1 } 
        }, (err) => { 
            if (!err) console.log('✅ Listening for sensor and alert topics...'); 
        });
    });

    client.on('message', async (topic, message, packet) => {
        const [prefix, tankId, sensorType] = topic.split('/');

        // Ignore retained messages for alerts to prevent re-processing old events on restart
        if (packet.retain && prefix === 'alert') {
            return;
        }

        try {
            const payload = JSON.parse(message.toString());

            if (prefix === 'alert') {
                await processAlert(
                    tankId,
                    sensorType,
                    payload.alert || 'OUT OF RANGE',
                    payload.value
                );
                return;
            }

            // ── Sensor data ingestion ────────────────────────────────────
            const mapping = SENSOR_MAP[sensorType];
            if (!mapping) {
                console.log(`⚠️ Unknown sensor topic: ${sensorType}`);
                return;
            }

            const sensorValue = parseFloat(payload.value);
            if (Number.isNaN(sensorValue)) {
                console.warn(`⚠️ Invalid sensor value for ${tankId}/${sensorType}: ${payload.value}`);
                return;
            }

            const [mongoField, influxField] = mapping;
            const readingTime = payload.time ? new Date(payload.time) : new Date();

            // Single DB call: update returns error if tank doesn't exist
            try {
                const updatedTank = await prisma.tank.update({
                    where: { tankId },
                    data: { 
                        [mongoField]: sensorValue, 
                        status: 'online',
                        lastReadingTime: readingTime 
                    },
                });

                // Real-time update via Socket.io
                if (io) {
                    io.emit('sensor_data', { 
                        tankId, 
                        sensorType, 
                        value: sensorValue,
                        timestamp: payload.time || updatedTank.updatedAt
                    });
                }
            } catch (updateErr) {
                // P2025 = Record not found — tank is not registered
                if (updateErr.code === 'P2025') {
                    return; // silently ignore unregistered tanks
                }
                throw updateErr;
            }

            // Write to InfluxDB with the actual reading time
            const point = new Point('water_quality')
                .tag('tankId', tankId)
                .floatField(influxField, sensorValue)
                .timestamp(readingTime);
            writeApi.writePoint(point);

        } catch (error) {
            console.error(`❌ MQTT Error for ${tankId}:`, error.message);
        }
    });

    client.on('error', (err) => {
        console.error('❌ MQTT Connection Error:', err.message);
    });

    client.on('offline', () => {
        console.warn('⚠️ MQTT client went offline');
    });

    client.on('reconnect', () => {
        console.log('🔄 MQTT reconnecting...');
    });
};

/**
 * Cleanly disconnect the MQTT client on server shutdown.
 */
export const shutdownMqtt = () => {
    if (mqttClient) {
        mqttClient.end(true);
        console.log('✅ MQTT client disconnected.');
    }
};

// ── Alert processing lock ────────────────────────────────────────────
// Key: alertKey string → Value: Promise that resolves when processing is done.
// This prevents the TOCTOU race where two concurrent calls both pass the checks.
const alertLocks = new Map();

// Cooldown cache: Maps `tankId:parameter` to { value, timestamp }
// Rule: Same value = 15 min block. Different value = 5 min block.
const categoryCooldowns = new Map();

/**
 * Process an alert: persist to DB, then notify users by email.
 * Uses a promise-based lock to guarantee only ONE concurrent execution per alert key.
 */
export const processAlert = async (tankId, parameter, alertType, sensorValue) => {
    const normalizedParam = parameter.toLowerCase();
    const categoryKey = `${tankId}:${normalizedParam}`;

    // ── GATE 1: Cooldown check (synchronous, instant) ────────────────
    const now = Date.now();
    const lastAlert = categoryCooldowns.get(categoryKey);

    if (lastAlert) {
        const timeSince = now - lastAlert.timestamp;
        const isSameValue = (lastAlert.value === sensorValue);
        const blockDuration = isSameValue ? 15 * 60 * 1000 : 5 * 60 * 1000; // 15 mins or 5 mins

        if (timeSince < blockDuration) {
            console.log(`🛡️  [GATE 1] Cooldown active for ${categoryKey} (SameValue=${isSameValue}, Blocked for ${blockDuration/60000}m) — suppressed.`);
            return;
        }
    }

    // ── GATE 2: Lock check — if another call is already processing, wait for it
    //    then return (the first caller will handle everything).
    if (alertLocks.has(categoryKey)) {
        console.log(`🛡️  [GATE 2] Lock active — waiting then skipping ${categoryKey}`);
        try { await alertLocks.get(categoryKey); } catch { /* ignore */ }
        return; // The first call already handled DB + email.
    }

    // ── Acquire the lock SYNCHRONOUSLY before any await ──────────────
    let releaseLock;
    const lockPromise = new Promise((resolve) => { releaseLock = resolve; });
    alertLocks.set(categoryKey, lockPromise);

    // Set cooldown immediately so any future calls within the block window are instant-rejected
    categoryCooldowns.set(categoryKey, { value: sensorValue, timestamp: now });

    try {
        await _processAlertImpl(tankId, normalizedParam, alertType, sensorValue);
    } catch (err) {
        console.error(`❌ processAlert top-level error for ${categoryKey}:`, err.message);
    } finally {
        // Release the lock so any waiters can exit
        releaseLock();
        alertLocks.delete(categoryKey);
    }
};

/**
 * Internal implementation — only ever called by one caller at a time per categoryKey.
 */
async function _processAlertImpl(tankId, normalizedParam, alertType, sensorValue) {
    console.log(`🚨 Processing ALERT for ${tankId}: ${normalizedParam} ${alertType} (${sensorValue})`);

    const tank = await prisma.tank.findUnique({
        where: { tankId },
        include: {
            admin: { select: { email: true } },
            workers: { select: { email: true } },
        },
    });

    if (!tank) {
        console.warn(`⚠️ Tank not found: ${tankId}`);
        return;
    }
    console.log(`✅ Tank found: ${tank.name} (registered=${tank.isRegistered})`);

    // We no longer block via DB 'resolved: false' check, so the DB updates
    // periodically according to the 5/15 minute cooldowns.

    // ── Create new alert record ──────────────────────────────────────
    const newAlert = await prisma.alert.create({
        data: {
            tankId,
            tankInternalId: tank.id,
            type: normalizedParam,
            message: alertType,
            value: sensorValue ?? 0,
            resolved: false,
        },
    });
    console.log(`✅ Alert saved to DB (id=${newAlert.id})`);

    // Real-time notification via Socket.io
    if (io) {
        io.emit('alert_new', { ...newAlert, tankName: tank.name });
    }

    // ── Send emails ──────────────────────────────────────────────────
    if (!tank.isRegistered || !tank.admin) {
        console.log(`ℹ️ Suppressing emails for unregistered device: ${tankId}`);
        return;
    }

    const emails = [...new Set([
        tank.admin.email.toLowerCase(),
        ...tank.workers.map((w) => w.email?.toLowerCase()),
    ].filter(Boolean))];

    if (emails.length > 0) {
        console.log(`📧 Sending emails to: ${emails.join(', ')}`);
        await Promise.allSettled(
            emails.map((email) =>
                sendAlertEmail(email, tank.name, `${normalizedParam} ${alertType}`, sensorValue)
            )
        );
        console.log(`✅ ${emails.length} email(s) sent.`);
    }
}

export const publishActuatorCommand = (topic, payload) => {
    if (!mqttClient || !mqttClient.connected) {
        throw new Error('MQTT broker is not connected.');
    }

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

    return new Promise((resolve, reject) => {
        mqttClient.publish(topic, message, { qos: 0 }, (error) => {
            if (error) return reject(error);
            resolve();
        });
    });
};