'use strict';

const { body, param, validationResult } = require('express-validator');
const { getDevices, createDevice, getDeviceById } = require('./device.service');

// ─── Validation rules ─────────────────────────────────────────────────────────
const createDeviceValidation = [
  body('tankId').notEmpty().withMessage('tankId is required'),
  body('deviceUid').notEmpty().withMessage('deviceUid is required'),
  body('deviceSecret')
    .isLength({ min: 8 })
    .withMessage('deviceSecret must be at least 8 characters'),
];

const deviceIdParamValidation = [
  param('id').notEmpty().withMessage('id is required'),
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
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Not Found', message: err.message });
    }
    // Prisma unique constraint violation (P2002 = duplicate deviceUid)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict', message: 'A device with that UID already exists.' });
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

    const device = await getDeviceById(req.params.id, req.user.id);
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
