'use strict';

const { body, param, validationResult } = require('express-validator');
const { getDevices, createDevice, getDeviceById } = require('./device.service');

// ─── Validation rules ─────────────────────────────────────────────────────────
const createDeviceValidation = [
  body('deviceId').isInt().withMessage('deviceId must be an integer'),
  body('deviceName').optional().isString(),
  body('location').optional().isString(),
];

const deviceIdParamValidation = [
  param('id').isInt().withMessage('id must be an integer'),
];

// ─── GET /devices ─────────────────────────────────────────────────────────────
async function listDevices(req, res, next) {
  try {
    const devices = await getDevices(req.user.id);
    return res.json(devices);
  } catch (err) {
    return next(err);
  }
}

// ─── POST /devices ────────────────────────────────────────────────────────────
async function addDevice(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const device = await createDevice(req.body, req.user.id);
    return res.status(201).json(device);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict', message: 'A device with that ID already exists.' });
    }
    return next(err);
  }
}

// ─── GET /devices/:id ─────────────────────────────────────────────────────────
async function getDevice(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const device = await getDeviceById(parseInt(req.params.id, 10), req.user.id);
    return res.json(device);
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Not Found', message: err.message });
    }
    return next(err);
  }
}

module.exports = {
  listDevices,
  addDevice,
  getDevice,
  createDeviceValidation,
  deviceIdParamValidation,
};
