'use strict';

const path    = require('path');
const fs      = require('fs');
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

// ─── Dev-only: Google Auth test page ─────────────────────────────────────────
// Accessible at http://localhost:3000/test-auth (development only)
if (config.app.nodeEnv !== 'production') {
  app.get('/test-auth', (_req, res) => {
    const htmlPath = path.join(__dirname, '../public/test-auth.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    // Inject the Google Client ID as a meta tag so the page can read it
    html = html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n  <meta name="google-client-id" content="${config.google.clientId}" />`
    );
    // Serve with relaxed CSP so Google's GSI script and accounts.google.com can load
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com; style-src 'self' 'unsafe-inline';"
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });
  logger.info('[App] Auth test page available at http://localhost:3000/test-auth');
}

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
