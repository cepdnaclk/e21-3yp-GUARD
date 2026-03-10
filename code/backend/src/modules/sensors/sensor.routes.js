'use strict';

const { Router } = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const { getLatest, getHistoryHandler, latestValidation, historyValidation } = require('./sensor.controller');

const router = Router();

router.use(authMiddleware);

// GET /sensor/latest?device_id=<int>
router.get('/latest', latestValidation, getLatest);

// GET /sensor/history?device_id=<int>&sensor_id=<int>&from=<ISO8601>&to=<ISO8601>
router.get('/history', historyValidation, getHistoryHandler);

module.exports = router;
