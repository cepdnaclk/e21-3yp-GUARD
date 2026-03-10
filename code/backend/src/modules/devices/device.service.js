'use strict';

const prisma = require('../../database/prismaClient');
const logger = require('../../utils/logger');

async function getDevices(userId) {
  return prisma.device.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

async function createDevice(data, userId) {
  const device = await prisma.device.create({
    data: {
      deviceId:   data.deviceId,
      userId,
      deviceName: data.deviceName || null,
      location:   data.location   || null,
    },
  });

  logger.info(`[Devices] Created device ${device.deviceId} for user ${userId}`);
  return device;
}

async function getDeviceById(deviceId, userId) {
  const device = await prisma.device.findFirst({
    where: { deviceId, userId },
  });

  if (!device) {
    const err = new Error('Device not found.');
    err.statusCode = 404;
    throw err;
  }

  return device;
}

module.exports = { getDevices, createDevice, getDeviceById };
