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
        clientId: 'GUARD_Backend',       // fixed ID — broker replaces old session
        clean: true,                      // discard any stale subscriptions
        rejectUnauthorized: true,
    });
    mqttClient = client;

    client.on('connect', () => {
        console.log(`☁️  MQTT connected to ${brokerUrl}`);
        client.subscribe(['sensor/+/+', 'alert/+/+'], (err) => {
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

            // Single DB call: update returns error if tank doesn't exist
            try {
                const updatedTank = await prisma.tank.update({
                    where: { tankId },
                    data: { [mongoField]: sensorValue, status: 'online' },
                });

                // Real-time update via Socket.io
                if (io) {
                    io.emit('sensor_data', { 
                        tankId, 
                        sensorType, 
                        value: sensorValue,
                        timestamp: updatedTank.updatedAt
                    });
                }
            } catch (updateErr) {
                // P2025 = Record not found — tank is not registered
                if (updateErr.code === 'P2025') {
                    return; // silently ignore unregistered tanks
                }
                throw updateErr;
            }

            // Write to InfluxDB (batched — flush handled by writeApi config)
            const point = new Point('water_quality')
                .tag('tankId', tankId)
                .floatField(influxField, sensorValue);
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

// Cache to prevent duplicate alerts within a short window (2 seconds)
const recentAlerts = new Map();

/**
 * Process an alert: persist to DB, then notify users by email.
 */
export const processAlert = async (tankId, parameter, alertType, sensorValue) => {
    // Generate a unique key for this alert (ignoring small value fluctuations)
    const alertKey = `${tankId}:${parameter}:${alertType}`;
    
    // If we've seen this alert type for this tank in the last 10 seconds, ignore it
    if (recentAlerts.has(alertKey)) {
        console.log(`🛡️  Duplicate alert suppressed for ${tankId}: ${parameter}`);
        return;
    }
    
    // Record this alert in the cache (10 second window)
    recentAlerts.set(alertKey, Date.now());
    setTimeout(() => recentAlerts.delete(alertKey), 10000);

    console.log(`🚨 ALERT for Tank ${tankId}: ${parameter} ${alertType} (${sensorValue})`);

    const tank = await prisma.tank.findUnique({
        where: { tankId },
        include: {
            admin: { select: { email: true } },
            workers: { select: { email: true } },
        },
    });

    if (!tank) {
        console.warn(`⚠️ Alert for unregistered Tank: ${tankId}`);
        return;
    }

    // Save alert to DB
    try {
        const alertData = {
            tankId,
            tankInternalId: tank.id,
            type: parameter,
            message: alertType,
            value: sensorValue ?? 0,
            resolved: false,
        };

        const newAlert = await prisma.alert.create({ data: alertData });
        
        // Real-time notification via Socket.io
        if (io) {
            io.emit('alert_new', {
                ...newAlert,
                tankName: tank.name
            });
        }
    } catch (dbError) {
        console.error('❌ Failed to save alert to DB:', dbError.message);
    }

    // Don't send emails if the device isn't registered yet or has no admin
    if (!tank.isRegistered || !tank.admin) {
        console.log(`ℹ️ Suppressing alert emails for unregistered device: ${tankId}`);
        return;
    }

    // Send emails concurrently (ensure unique emails case-insensitively)
    const emails = [...new Set([
        tank.admin.email.toLowerCase(),
        ...tank.workers.map((w) => w.email?.toLowerCase()),
    ].filter(Boolean))];

    if (emails.length > 0) {
        await Promise.allSettled(
            emails.map((email) =>
                sendAlertEmail(email, tank.name, `${parameter} ${alertType}`, sensorValue)
            )
        );
        console.log(`📧 Alert emails sent to ${emails.length} recipient(s): ${emails.join(', ')}`);
    }
};

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