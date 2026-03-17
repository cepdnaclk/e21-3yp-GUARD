'use strict';

const { body, param, validationResult } = require('express-validator');
const { getSensorTypes, createSensorType, getSensorTypeById } = require('./sensorType.service');

const createSensorTypeValidation = [
  body('sensorName').notEmpty().withMessage('sensorName is required'),
  body('frequency').notEmpty().withMessage('frequency is required (e.g. hourly, twice_daily, weekly)'),
];

const sensorTypeIdParamValidation = [
  param('id').isInt().withMessage('id must be an integer'),
];

async function listSensorTypes(req, res, next) {
  try {
    const types = await getSensorTypes();
    return res.json(types);
  } catch (err) {
    return next(err);
  }
}

async function addSensorType(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const sensorType = await createSensorType(req.body);
    return res.status(201).json(sensorType);
  } catch (err) {
    return next(err);
  }
}

async function getSensorType(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const sensorType = await getSensorTypeById(parseInt(req.params.id, 10));
    if (!sensorType) {
      return res.status(404).json({ error: 'Not Found', message: 'Sensor type not found.' });
    }

    return res.json(sensorType);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listSensorTypes,
  addSensorType,
  getSensorType,
  createSensorTypeValidation,
  sensorTypeIdParamValidation,
};
