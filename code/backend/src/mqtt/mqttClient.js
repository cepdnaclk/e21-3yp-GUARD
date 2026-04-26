'use strict';

const mqtt = require('mqtt');
const config = require('../config/config');
const prisma = require('../database/prismaClient');
const { detectAlerts } = require('../modules/alerts/alert.service');
const { notifyAlert } = require('../modules/notifications/notification.service');
const logger = require('../utils/logger');

// Topic pattern: sensor/<deviceId>/<sensorName>  e.g. sensor/100/temperature
const SUBSCRIBE_TOPIC = 'sensor/+/+';

async function processMessage(topic, payload) {
  // Parse topic: sensor/<deviceId>/<sensorName>
  const parts = topic.split('/');
  if (parts.length !== 3 || parts[0] !== 'sensor') {
    logger.warn(`[MQTT] Unexpected topic format: "${topic}" — ignoring.`);
    return;
  }

  const deviceId = parseInt(parts[1], 10);
  const sensorName = parts[2]; // e.g. "temperature", "ph", "tds"

  if (isNaN(deviceId)) {
    logger.warn(`[MQTT] Invalid device ID in topic: "${topic}" — ignoring.`);
    return;
  }

  // Validate device exists
  const device = await prisma.device.findUnique({ where: { deviceId } });
  if (!device) {
    logger.warn(`[MQTT] Unknown device_id: ${deviceId} — ignoring message.`);
    return;
  }

  // Resolve sensor type by name (case-insensitive)
  const sensorType = await prisma.sensorType.findFirst({
    where: { sensorName: { equals: sensorName, mode: 'insensitive' } },
  });

  if (!sensorType) {
    logger.warn(`[MQTT] Unknown sensor type: "${sensorName}" — ignoring message.`);
    return;
  }

  // Parse the payload: { "value": 27.5, "time": "2026-03-09 14:22:10" }
  const { value, time } = payload;

  if (value === undefined || value === null) {
    logger.warn(`[MQTT] Missing "value" in payload for ${topic} — ignoring.`);
    return;
  }

  const readingTime = time ? new Date(time) : new Date();

  // Persist sensor reading
  const reading = await prisma.sensorReading.create({
    data: {
      deviceId: device.deviceId,
      sensorId: sensorType.id,
      value:    parseFloat(value),
      readingTime,
    },
  });

  logger.debug(
    `[MQTT] Reading stored — device: ${deviceId}, sensor: ${sensorName}, ` +
    `value: ${value}, time: ${readingTime.toISOString()}`
  );

  // Detect alerts
  const alerts = await detectAlerts(reading, device, sensorType);
  for (const alert of alerts) {
    await notifyAlert(alert, device);
  }
}

function connectMQTT() {
  const client = mqtt.connect(config.mqtt.brokerUrl, {
    clientId:        `guard-backend-${Date.now()}`,
    clean:           true,
    reconnectPeriod: 5000,
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
      await processMessage(topic, payload);
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
