'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../../database/prismaClient');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = 10;

// Strip the hashed secret before sending device data to clients
function sanitizeDevice(device) {
  const { deviceSecret, ...safe } = device;
  return safe;
}

// ─── Get all devices owned by a user ─────────────────────────────────────────
/**
 * Returns all devices that belong to tanks within locations owned by the user.
 * @param {string} userId
 */
async function getDevices(userId) {
  const devices = await prisma.device.findMany({
    where: {
      tank: {
        location: { ownerId: userId },
      },
    },
    include: {
      tank: {
        include: { location: true },
      },
    },
    orderBy: { lastSeen: 'desc' },
  });

  return devices.map(sanitizeDevice);
}

// ─── Create a new device ──────────────────────────────────────────────────────
/**
 * Registers a new ESP32 device under a tank.
 * Hashes the deviceSecret with bcrypt before persisting.
 *
 * @param {{ tankId: string, deviceUid: string, deviceSecret: string }} data
 * @param {string} userId - owner; used to verify the target tank belongs to them
 */
async function createDevice(data, userId) {
  // Ensure the target tank belongs to the requesting user
  const tank = await prisma.tank.findFirst({
    where: {
      id: data.tankId,
      location: { ownerId: userId },
    },
  });

  if (!tank) {
    const err = new Error('Tank not found or access denied.');
    err.statusCode = 404;
    throw err;
  }

  const hashedSecret = await bcrypt.hash(data.deviceSecret, BCRYPT_ROUNDS);

  const device = await prisma.device.create({
    data: {
      tankId: data.tankId,
      deviceUid: data.deviceUid,
      deviceSecret: hashedSecret,
      status: 'UNKNOWN',
    },
    include: {
      tank: { include: { location: true } },
    },
  });

  logger.info(`[Devices] Created device ${device.id} (uid: ${device.deviceUid})`);
  return sanitizeDevice(device);
}

// ─── Get a single device by ID ────────────────────────────────────────────────
/**
 * Returns a device by its primary key, with an ownership check on the user.
 * @param {string} id
 * @param {string} userId
 */
async function getDeviceById(id, userId) {
  const device = await prisma.device.findFirst({
    where: {
      id,
      tank: { location: { ownerId: userId } },
    },
    include: {
      tank: { include: { location: true } },
    },
  });

  if (!device) {
    const err = new Error('Device not found.');
    err.statusCode = 404;
    throw err;
  }

  return sanitizeDevice(device);
}

module.exports = { getDevices, createDevice, getDeviceById };
