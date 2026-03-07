'use strict';

const { Router } = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const {
  listDevices,
  addDevice,
  getDevice,
  createDeviceValidation,
  deviceIdParamValidation,
} = require('./device.controller');

const router = Router();

// All device routes require a valid JWT
router.use(authMiddleware);

router.get('/', listDevices);
router.post('/', createDeviceValidation, addDevice);
router.get('/:id', deviceIdParamValidation, getDevice);

module.exports = router;
