'use strict';

const http = require('http');

// Validate environment variables immediately — process.exit(1) if any are missing
require('./config/config');

const app    = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');
const { initNotifications } = require('./modules/notifications/notification.service');
const connectMQTT           = require('./mqtt/mqttClient');

// ─── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer(app);

// Attach socket.io to the HTTP server (before listen)
initNotifications(server);

// Connect to the MQTT broker
connectMQTT();

// ─── Start listening ──────────────────────────────────────────────────────────
const PORT = config.app.port;

server.listen(PORT, () => {
  logger.info(`[Server] G.U.A.R.D backend running on port ${PORT}`);
  logger.info(`[Server] Environment : ${config.app.nodeEnv}`);
  logger.info(`[Server] Health check: http://localhost:${PORT}/health`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`[Server] ${signal} received — shutting down gracefully...`);
  server.close(() => {
    logger.info('[Server] HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
