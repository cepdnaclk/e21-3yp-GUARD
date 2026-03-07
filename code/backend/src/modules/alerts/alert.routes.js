'use strict';

const { Router } = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const {
  listAlerts,
  resolveAlertHandler,
  listAlertsValidation,
  resolveAlertValidation,
} = require('./alert.controller');

const router = Router();

router.use(authMiddleware);

// GET /alerts?device_id=<uuid>&resolved=<bool>
router.get('/', listAlertsValidation, listAlerts);

// POST /alerts/resolve  body: { alertId: string }
router.post('/resolve', resolveAlertValidation, resolveAlertHandler);

module.exports = router;
