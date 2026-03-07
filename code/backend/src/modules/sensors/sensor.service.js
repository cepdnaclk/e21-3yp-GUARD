'use strict';

const prisma = require('../../database/prismaClient');

// Maximum rows returned by a history query to prevent overloading the client
const MAX_HISTORY_ROWS = 1000;

// ─── Latest reading ───────────────────────────────────────────────────────────
/**
 * Returns the most recent sensor reading for the given device.
 * @param {string} deviceId
 */
async function getLatestReading(deviceId) {
  return prisma.sensorReading.findFirst({
    where: { deviceId },
    orderBy: { timestamp: 'desc' },
  });
}

// ─── Historical readings ──────────────────────────────────────────────────────
/**
 * Returns sensor readings for a device within an optional time range.
 * Results are sorted ascending by timestamp and capped at MAX_HISTORY_ROWS.
 *
 * @param {string}        deviceId
 * @param {string|Date}  [from]    ISO date string — start of range (inclusive)
 * @param {string|Date}  [to]      ISO date string — end of range (inclusive)
 */
async function getHistory(deviceId, from, to) {
  const where = { deviceId };

  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to)   where.timestamp.lte = new Date(to);
  }

  return prisma.sensorReading.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    take: MAX_HISTORY_ROWS,
  });
}

module.exports = { getLatestReading, getHistory };
