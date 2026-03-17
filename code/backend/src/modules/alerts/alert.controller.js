'use strict';

const { query, body, validationResult } = require('express-validator');
const { getAlerts, resolveAlert } = require('./alert.service');

// ─── Validation rules ─────────────────────────────────────────────────────────
const listAlertsValidation = [
  query('device_id').optional().isInt().withMessage('device_id must be an integer'),
  query('resolved').optional().isBoolean().withMessage('resolved must be true or false'),
];

const resolveAlertValidation = [
  body('alertId').notEmpty().withMessage('alertId is required'),
];

// ─── GET /alerts ──────────────────────────────────────────────────────────────
async function listAlerts(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const filters = {};
    if (req.query.device_id) filters.deviceId = parseInt(req.query.device_id, 10);
    if (req.query.resolved !== undefined) {
      filters.resolved = req.query.resolved === 'true';
    }

    const alerts = await getAlerts(req.user.id, filters);
    return res.json(alerts);
  } catch (err) {
    return next(err);
  }
}

// ─── POST /alerts/resolve ─────────────────────────────────────────────────────
async function resolveAlertHandler(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const updated = await resolveAlert(req.body.alertId, req.user.id);
    return res.json(updated);
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Not Found', message: err.message });
    }
    return next(err);
  }
}

module.exports = {
  listAlerts,
  resolveAlertHandler,
  listAlertsValidation,
  resolveAlertValidation,
};
