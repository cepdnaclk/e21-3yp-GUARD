'use strict';

const { query, validationResult } = require('express-validator');
const { getLatestReadings, getHistory } = require('./sensor.service');
const prisma = require('../../database/prismaClient');

async function getOwnedDevice(deviceId, userId) {
  return prisma.device.findFirst({
    where: { deviceId, userId },
  });
}

// ─── Validation rules ─────────────────────────────────────────────────────────
const latestValidation = [
  query('device_id').isInt().withMessage('device_id must be an integer'),
];

const historyValidation = [
  query('device_id').isInt().withMessage('device_id must be an integer'),
  query('sensor_id').optional().isInt().withMessage('sensor_id must be an integer'),
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

    const deviceId = parseInt(req.query.device_id, 10);

    const device = await getOwnedDevice(deviceId, req.user.id);
    if (!device) {
      return res.status(404).json({ error: 'Not Found', message: 'Device not found.' });
    }

    const readings = await getLatestReadings(deviceId);
    return res.json(readings);
  } catch (err) {
    return next(err);
  }
}

// ─── GET /sensor/history?device_id=&sensor_id=&from=&to= ─────────────────────
async function getHistoryHandler(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const deviceId = parseInt(req.query.device_id, 10);
    const sensorId = req.query.sensor_id ? parseInt(req.query.sensor_id, 10) : undefined;
    const { from, to } = req.query;

    const device = await getOwnedDevice(deviceId, req.user.id);
    if (!device) {
      return res.status(404).json({ error: 'Not Found', message: 'Device not found.' });
    }

    const readings = await getHistory(deviceId, { sensorId, from, to });
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
