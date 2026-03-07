'use strict';

const { query, validationResult } = require('express-validator');
const { getLatestReading, getHistory } = require('./sensor.service');
const prisma = require('../../database/prismaClient');

// ─── Ownership helper ─────────────────────────────────────────────────────────
/**
 * Returns the device if it belongs to the user; null otherwise.
 * Used before serving sensor data to prevent cross-user data leakage.
 */
async function getOwnedDevice(deviceId, userId) {
  return prisma.device.findFirst({
    where: {
      id: deviceId,
      tank: { location: { ownerId: userId } },
    },
  });
}

// ─── Validation rules ─────────────────────────────────────────────────────────
const latestValidation = [
  query('device_id').notEmpty().withMessage('device_id is required'),
];

const historyValidation = [
  query('device_id').notEmpty().withMessage('device_id is required'),
  query('from').optional().isISO8601().withMessage('from must be an ISO 8601 date string'),
  query('to').optional().isISO8601().withMessage('to must be an ISO 8601 date string'),
];

// ─── GET /sensor/latest?device_id= ───────────────────────────────────────────
async function getLatest(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const { device_id: deviceId } = req.query;

    const device = await getOwnedDevice(deviceId, req.user.id);
    if (!device) {
      return res.status(404).json({ error: 'Not Found', message: 'Device not found.' });
    }

    const reading = await getLatestReading(deviceId);
    if (!reading) {
      return res.status(404).json({ error: 'Not Found', message: 'No readings found for this device.' });
    }

    return res.json(reading);
  } catch (err) {
    return next(err);
  }
}

// ─── GET /sensor/history?device_id=&from=&to= ────────────────────────────────
async function getHistoryHandler(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const { device_id: deviceId, from, to } = req.query;

    const device = await getOwnedDevice(deviceId, req.user.id);
    if (!device) {
      return res.status(404).json({ error: 'Not Found', message: 'Device not found.' });
    }

    const readings = await getHistory(deviceId, from, to);
    return res.json(readings);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getLatest,
  getHistoryHandler,
  latestValidation,
  historyValidation,
};
