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

  const valueBySensorName = {
    temperature: data.temperature,
    ph: data.ph,
    turbidity: data.turbidity,
    water_level: data.waterLevel,
  };

  const hasInitialValues = Object.values(valueBySensorName).some((v) => v !== undefined && v !== null);
  if (hasInitialValues) {
    const sensorTypes = await prisma.sensorType.findMany({
      where: {
        sensorName: { in: Object.keys(valueBySensorName) },
      },
      select: { id: true, sensorName: true },
    });

    const readingTime = new Date();
    const readings = sensorTypes
      .filter((st) => valueBySensorName[st.sensorName] !== undefined && valueBySensorName[st.sensorName] !== null)
      .map((st) => ({
        deviceId: device.deviceId,
        sensorId: st.id,
        value: Number(valueBySensorName[st.sensorName]),
        readingTime,
      }));

    if (readings.length > 0) {
      await prisma.sensorReading.createMany({ data: readings });
    }
  }

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
