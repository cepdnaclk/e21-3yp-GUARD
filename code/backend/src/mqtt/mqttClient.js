'use strict';

const mqtt = require('mqtt');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const prisma = require('../database/prismaClient');
const { detectAlerts } = require('../modules/alerts/alert.service');
const { notifyAlert } = require('../modules/notifications/notification.service');
const logger = require('../utils/logger');

// Topic pattern: aquamonitor/devices/<device_uid>/data
const SUBSCRIBE_TOPIC = 'aquamonitor/devices/+/data';

// ─── Message processing pipeline ─────────────────────────────────────────────
/**
 * Processes a single validated MQTT data message from an ESP32 device.
 *
 * Flow:
 *  1. Extract and validate device_id / device_secret from payload
 *  2. Lookup device in DB; verify bcrypt secret hash
 *  3. Update device.lastSeen and set status = ONLINE
 *  4. Persist the sensor reading
 *  5. Run alert detection rules
 *  6. Dispatch notifications for each newly triggered alert
 *
 * @param {object} payload - Parsed JSON from the MQTT message
 */
async function processMessage(payload) {
  const {
    device_id: deviceUid,
    device_secret: deviceSecret,
    ph,
    temperature,
    tds,
    turbidity,
    water_level: waterLevel,
  } = payload;

  // ── Step 1: Validate required fields ────────────────────────────────────────
  if (!deviceUid || !deviceSecret) {
    logger.warn('[MQTT] Message missing device_id or device_secret — ignoring.');
    return;
  }

  // ── Step 2: Authenticate device ─────────────────────────────────────────────
  const device = await prisma.device.findUnique({ where: { deviceUid } });

  if (!device) {
    logger.warn(`[MQTT] Unknown device_uid: "${deviceUid}" — ignoring message.`);
    return;
  }

  const isValid = await bcrypt.compare(String(deviceSecret), device.deviceSecret);
  if (!isValid) {
    logger.warn(`[MQTT] Invalid device_secret for device "${deviceUid}" — ignoring message.`);
    return;
  }

  // ── Step 3: Update device presence ──────────────────────────────────────────
  await prisma.device.update({
    where: { id: device.id },
    data: { lastSeen: new Date(), status: 'ONLINE' },
  });

  // ── Step 4: Persist sensor reading ──────────────────────────────────────────
  const reading = await prisma.sensorReading.create({
    data: {
      deviceId: device.id,
      ph:          ph          !== undefined ? parseFloat(ph)          : null,
      temperature: temperature !== undefined ? parseFloat(temperature) : null,
      tds:         tds         !== undefined ? parseFloat(tds)         : null,
      turbidity:   turbidity   !== undefined ? parseFloat(turbidity)   : null,
      waterLevel:  waterLevel  !== undefined ? parseFloat(waterLevel)  : null,
    },
  });

  logger.debug(
    `[MQTT] Reading stored — device: ${deviceUid} | ` +
    `pH: ${ph}, temp: ${temperature}°C, TDS: ${tds}, ` +
    `turbidity: ${turbidity}, water_level: ${waterLevel}%`
  );

  // ── Step 5 & 6: Detect alerts and notify ────────────────────────────────────
  const alerts = await detectAlerts(reading, device);
  for (const alert of alerts) {
    await notifyAlert(alert, device);
  }
}

// ─── MQTT client factory ──────────────────────────────────────────────────────
/**
 * Creates and returns a connected MQTT client.
 * Subscribes to the device data topic and wires up all event handlers.
 *
 * @returns {import('mqtt').MqttClient}
 */
function connectMQTT() {
  const client = mqtt.connect(config.mqtt.brokerUrl, {
    clientId:        `guard-backend-${Date.now()}`,
    clean:           true,
    reconnectPeriod: 5000,  // Attempt reconnect every 5 seconds
    connectTimeout:  30000,
    username:        config.mqtt.username,
    password:        config.mqtt.password,
  });

  client.on('connect', () => {
    logger.info(`[MQTT] Connected to broker at ${config.mqtt.brokerUrl}`);

    client.subscribe(SUBSCRIBE_TOPIC, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`[MQTT] Subscription error: ${err.message}`);
      } else {
        logger.info(`[MQTT] Subscribed to topic: ${SUBSCRIBE_TOPIC}`);
      }
    });
  });

  client.on('message', async (topic, rawMessage) => {
    logger.debug(`[MQTT] Message on topic: ${topic}`);

    let payload;
    try {
      payload = JSON.parse(rawMessage.toString());
    } catch (parseErr) {
      logger.warn(`[MQTT] Invalid JSON on topic "${topic}": ${parseErr.message}`);
      return;
    }

    try {
      await processMessage(payload);
    } catch (err) {
      logger.error(`[MQTT] Pipeline error on topic "${topic}": ${err.message}`);
    }
  });

  client.on('reconnect', () => logger.info('[MQTT] Reconnecting to broker...'));
  client.on('offline',   () => logger.warn('[MQTT] Client went offline.'));
  client.on('error',     (err) => logger.error(`[MQTT] Connection error: ${err.message}`));

  return client;
}

module.exports = connectMQTT;
