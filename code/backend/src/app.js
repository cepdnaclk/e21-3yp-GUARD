'use strict';

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const config  = require('./config/config');
const logger  = require('./utils/logger');

// ─── Route modules ────────────────────────────────────────────────────────────
const authRoutes   = require('./modules/auth/auth.routes');
const deviceRoutes = require('./modules/devices/device.routes');
const sensorRoutes = require('./modules/sensors/sensor.routes');
const alertRoutes  = require('./modules/alerts/alert.routes');

const app = express();

// ─── Global middleware ────────────────────────────────────────────────────────

// Set secure HTTP headers (removes X-Powered-By, adds CSP, etc.)
app.use(helmet());

// CORS — restrict to origins configured via CORS_ORIGIN env var
app.use(
  cors({
    origin: config.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  })
);

// HTTP request logging
app.use(morgan(config.app.nodeEnv === 'production' ? 'combined' : 'dev'));

// Parse JSON bodies (limit prevents large payloads)
app.use(express.json({ limit: '1mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',    authRoutes);
app.use('/devices', deviceRoutes);
app.use('/sensor',  sensorRoutes);
app.use('/alerts',  alertRoutes);

// Health check — used by Docker healthcheck and load balancers
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Must have exactly 4 parameters for Express to treat it as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode === 500) {
    logger.error(`[App] Unhandled error: ${err.stack || err.message}`);
  }

  return res.status(statusCode).json({
    error: err.name || 'Error',
    message: statusCode === 500 ? 'Internal server error.' : err.message,
  });
});

module.exports = app;
