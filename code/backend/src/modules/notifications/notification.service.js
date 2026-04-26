'use strict';

const nodemailer = require('nodemailer');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// socket.io server instance — injected by initNotifications()
let io = null;

// ─── Initialise notification service ─────────────────────────────────────────
/**
 * Attaches a socket.io server to the Node.js HTTP server.
 * Must be called once at startup before the server begins listening.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initNotifications(httpServer) {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.debug(`[Notifications] WebSocket client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      logger.debug(`[Notifications] WebSocket client disconnected: ${socket.id}`);
    });
  });

  logger.info('[Notifications] WebSocket server initialised.');
  return io;
}

// ─── Nodemailer transporter (lazy singleton) ──────────────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const { host, port, user, pass } = config.smtp;
  if (!host || !user || !pass) return null; // Email disabled — SMTP not configured

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465 (SSL), false for STARTTLS
    auth: { user, pass },
  });

  return _transporter;
}

// ─── Send alert notifications ─────────────────────────────────────────────────
/**
 * Dispatches an alert through all enabled notification channels:
 *   1. Winston console log  (always)
 *   2. WebSocket broadcast  (always, when a WS client is connected)
 *   3. Email via Nodemailer (only when SMTP environment variables are set)
 *
 * @param {import('@prisma/client').Alert}  alert
 * @param {import('@prisma/client').Device} device
 */
async function notifyAlert(alert, device) {
  // ── 1. Console log ──────────────────────────────────────────────────────────
  logger.warn(
    `[ALERT] ${alert.type} | Device: ${device.deviceUid} | ${alert.message}`
  );

  // ── 2. WebSocket broadcast ──────────────────────────────────────────────────
  if (io) {
    io.emit('alert', {
      id: alert.id,
      type: alert.type,
      message: alert.message,
      value: alert.value,
      deviceUid: device.deviceUid,
      createdAt: alert.createdAt,
    });
  }

  // ── 3. Email notification ───────────────────────────────────────────────────
  const transporter = getTransporter();
  const { alertEmail } = config.smtp;

  if (transporter && alertEmail) {
    try {
      await transporter.sendMail({
        from: `"G.U.A.R.D Monitoring" <${config.smtp.user}>`,
        to: alertEmail,
        subject: `[G.U.A.R.D] ${alert.type} alert on device ${device.deviceUid}`,
        text: [
          'G.U.A.R.D Alert Notification',
          '',
          `Device:  ${device.deviceUid}`,
          `Type:    ${alert.type}`,
          `Message: ${alert.message}`,
          `Value:   ${alert.value}`,
          `Time:    ${new Date(alert.createdAt).toISOString()}`,
        ].join('\n'),
        html: `
          <h2 style="color:#d32f2f;">G.U.A.R.D Alert</h2>
          <table>
            <tr><td><strong>Device</strong></td><td>${device.deviceUid}</td></tr>
            <tr><td><strong>Type</strong></td><td>${alert.type}</td></tr>
            <tr><td><strong>Message</strong></td><td>${alert.message}</td></tr>
            <tr><td><strong>Value</strong></td><td>${alert.value}</td></tr>
            <tr><td><strong>Time</strong></td><td>${new Date(alert.createdAt).toISOString()}</td></tr>
          </table>
        `,
      });

      logger.info(`[Notifications] Email alert sent to ${alertEmail}`);
    } catch (emailErr) {
      // Email failure should not crash the ingestion pipeline
      logger.error(`[Notifications] Failed to send email: ${emailErr.message}`);
    }
  }
}

module.exports = { initNotifications, notifyAlert };
