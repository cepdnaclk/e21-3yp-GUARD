'use strict';

const prisma = require('../../database/prismaClient');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// ─── Alert detection engine ───────────────────────────────────────────────────
/**
 * Compares a sensor reading against all configured thresholds.
 * For each violated rule, creates an Alert record — but only if no unresolved
 * alert of the same type already exists for that device (deduplication).
 *
 * @param {object} reading - SensorReading record from Prisma
 * @param {object} device  - Device record from Prisma
 * @returns {Promise<import('@prisma/client').Alert[]>} array of newly created Alert records
 */
async function detectAlerts(reading, device) {
  const { thresholds } = config;

  // Define all alert rules declaratively
  const rules = [
    {
      type: 'TEMP_HIGH',
      value: reading.temperature,
      triggered: reading.temperature !== null && reading.temperature > thresholds.tempMax,
      message: `Temperature ${reading.temperature}°C exceeds maximum threshold of ${thresholds.tempMax}°C`,
    },
    {
      type: 'TEMP_LOW',
      value: reading.temperature,
      triggered: reading.temperature !== null && reading.temperature < thresholds.tempMin,
      message: `Temperature ${reading.temperature}°C is below minimum threshold of ${thresholds.tempMin}°C`,
    },
    {
      type: 'PH_HIGH',
      value: reading.ph,
      triggered: reading.ph !== null && reading.ph > thresholds.phMax,
      message: `pH ${reading.ph} exceeds maximum threshold of ${thresholds.phMax}`,
    },
    {
      type: 'PH_LOW',
      value: reading.ph,
      triggered: reading.ph !== null && reading.ph < thresholds.phMin,
      message: `pH ${reading.ph} is below minimum threshold of ${thresholds.phMin}`,
    },
    {
      type: 'TURBIDITY_HIGH',
      value: reading.turbidity,
      triggered: reading.turbidity !== null && reading.turbidity > thresholds.turbidityMax,
      message: `Turbidity ${reading.turbidity} NTU exceeds maximum threshold of ${thresholds.turbidityMax} NTU`,
    },
    {
      type: 'WATER_LEVEL_LOW',
      value: reading.waterLevel,
      triggered: reading.waterLevel !== null && reading.waterLevel < thresholds.waterLevelMin,
      message: `Water level ${reading.waterLevel}% is below minimum threshold of ${thresholds.waterLevelMin}%`,
    },
  ];

  const createdAlerts = [];

  for (const rule of rules) {
    if (!rule.triggered) continue;

    // Deduplication: skip if an unresolved alert of the same type already exists
    const existing = await prisma.alert.findFirst({
      where: { deviceId: device.id, type: rule.type, resolved: false },
    });

    if (existing) {
      logger.debug(
        `[Alerts] Skipping duplicate active alert: ${rule.type} on device ${device.deviceUid}`
      );
      continue;
    }

    const alert = await prisma.alert.create({
      data: {
        deviceId: device.id,
        type: rule.type,
        message: rule.message,
        value: rule.value,
        resolved: false,
      },
    });

    logger.warn(`[Alerts] ALERT TRIGGERED — ${rule.type}: ${rule.message}`);
    createdAlerts.push(alert);
  }

  return createdAlerts;
}

// ─── List alerts ──────────────────────────────────────────────────────────────
/**
 * Returns alerts scoped to the authenticated user's devices.
 * Supports optional filtering by deviceId and resolved status.
 *
 * @param {string} userId
 * @param {{ deviceId?: string, resolved?: boolean }} [filters]
 */
async function getAlerts(userId, filters = {}) {
  const where = {
    device: { tank: { location: { ownerId: userId } } },
  };

  if (filters.deviceId) where.deviceId = filters.deviceId;
  if (filters.resolved !== undefined) where.resolved = filters.resolved;

  return prisma.alert.findMany({
    where,
    include: {
      device: {
        select: { deviceUid: true, tankId: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Resolve an alert ─────────────────────────────────────────────────────────
/**
 * Marks a single alert as resolved.
 * Verifies that the alert belongs to a device owned by the requesting user.
 *
 * @param {string} alertId
 * @param {string} userId
 */
async function resolveAlert(alertId, userId) {
  const alert = await prisma.alert.findFirst({
    where: {
      id: alertId,
      device: { tank: { location: { ownerId: userId } } },
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
