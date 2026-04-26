'use strict';

const { Router } = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const {
  listSensorTypes,
  addSensorType,
  getSensorType,
  createSensorTypeValidation,
  sensorTypeIdParamValidation,
} = require('./sensorType.controller');

const router = Router();

router.use(authMiddleware);

router.get('/', listSensorTypes);
router.post('/', createSensorTypeValidation, addSensorType);
router.get('/:id', sensorTypeIdParamValidation, getSensorType);

module.exports = router;
