'use strict';

require('dotenv').config();

// ─── Required environment variable validation ───────────────────────────────
// The server will exit immediately at startup if any required variable is unset.
const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[Config] FATAL — Missing required environment variables: ${missing.join(', ')}`);
  console.error('[Config] Copy .env.example to .env and fill in all required values.');
  process.exit(1);
}

// ─── Central configuration object ───────────────────────────────────────────
const config = {
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  db: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '1d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },

  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://mosquitto:1883',
  },

  cors: {
    // Supports a comma-separated list of origins in the env var
    origins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
  },

  // Alert thresholds — all configurable via environment variables
  thresholds: {
    tempMax: parseFloat(process.env.TEMP_MAX) || 32,
    tempMin: parseFloat(process.env.TEMP_MIN) || 20,
    phMax: parseFloat(process.env.PH_MAX) || 8.5,
    phMin: parseFloat(process.env.PH_MIN) || 6.5,
    turbidityMax: parseFloat(process.env.TURBIDITY_MAX) || 50,
    waterLevelMin: parseFloat(process.env.WATER_LEVEL_MIN) || 20,
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    alertEmail: process.env.ALERT_EMAIL || '',
  },
};

module.exports = config;
