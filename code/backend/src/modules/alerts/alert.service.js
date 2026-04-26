'use strict';

const prisma = require('../../database/prismaClient');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// Maps sensor names to alert rules
const ALERT_RULES = {
  temperature: [
    { type: 'TEMP_HIGH', check: (v, t) => v > t.tempMax, msg: (v, t) => `Temperature ${v}°C exceeds maximum threshold of ${t.tempMax}°C` },
    { type: 'TEMP_LOW',  check: (v, t) => v < t.tempMin, msg: (v, t) => `Temperature ${v}°C is below minimum threshold of ${t.tempMin}°C` },
  ],
  ph: [
    { type: 'PH_HIGH', check: (v, t) => v > t.phMax, msg: (v, t) => `pH ${v} exceeds maximum threshold of ${t.phMax}` },
    { type: 'PH_LOW',  check: (v, t) => v < t.phMin, msg: (v, t) => `pH ${v} is below minimum threshold of ${t.phMin}` },
  ],
  turbidity: [
    { type: 'TURBIDITY_HIGH', check: (v, t) => v > t.turbidityMax, msg: (v, t) => `Turbidity ${v} NTU exceeds maximum threshold of ${t.turbidityMax} NTU` },
  ],
  water_level: [
    { type: 'WATER_LEVEL_LOW', check: (v, t) => v < t.waterLevelMin, msg: (v, t) => `Water level ${v}% is below minimum threshold of ${t.waterLevelMin}%` },
  ],
};

async function detectAlerts(reading, device, sensorType) {
  const { thresholds } = config;
  const sensorKey = sensorType.sensorName.toLowerCase();
  const rules = ALERT_RULES[sensorKey];

  if (!rules) return [];

  const createdAlerts = [];

  for (const rule of rules) {
    if (!rule.check(reading.value, thresholds)) continue;

    // Deduplication: skip if an unresolved alert of the same type already exists
    const existing = await prisma.alert.findFirst({
      where: { deviceId: device.deviceId, type: rule.type, resolved: false },
    });

    if (existing) {
      logger.debug(`[Alerts] Skipping duplicate active alert: ${rule.type} on device ${device.deviceId}`);
      continue;
    }

    const alert = await prisma.alert.create({
      data: {
        deviceId: device.deviceId,
        type:     rule.type,
        message:  rule.msg(reading.value, thresholds),
        value:    reading.value,
        resolved: false,
      },
    });

    logger.warn(`[Alerts] ALERT TRIGGERED — ${rule.type}: ${alert.message}`);
    createdAlerts.push(alert);
  }

  return createdAlerts;
}

async function getAlerts(userId, filters = {}) {
  const where = {
    device: { userId },
  };

  if (filters.deviceId) where.deviceId = filters.deviceId;
  if (filters.resolved !== undefined) where.resolved = filters.resolved;

  return prisma.alert.findMany({
    where,
    include: {
      device: {
        select: { deviceId: true, deviceName: true, location: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function resolveAlert(alertId, userId) {
  const alert = await prisma.alert.findFirst({
    where: {
      id: alertId,
      device: { userId },
    },
  });

  if (!alert) {
    const err = new Error('Alert not found.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.alert.update({
    where: { id: alertId },
    data: { resolved: true },
  });
}

module.exports = { detectAlerts, getAlerts, resolveAlert };
