'use strict';

const prisma = require('../../database/prismaClient');

const MAX_HISTORY_ROWS = 1000;

async function getLatestReadings(deviceId) {
  // Get the latest reading for each sensor type on this device
  const sensorTypes = await prisma.sensorType.findMany();

  const latestReadings = [];
  for (const st of sensorTypes) {
    const reading = await prisma.sensorReading.findFirst({
      where: { deviceId, sensorId: st.id },
      orderBy: { readingTime: 'desc' },
      include: { sensorType: true },
    });
    if (reading) latestReadings.push(reading);
  }

  return latestReadings;
}

async function getHistory(deviceId, { sensorId, from, to } = {}) {
  const where = { deviceId };

  if (sensorId) where.sensorId = sensorId;

  if (from || to) {
    where.readingTime = {};
    if (from) where.readingTime.gte = new Date(from);
    if (to)   where.readingTime.lte = new Date(to);
  }

  return prisma.sensorReading.findMany({
    where,
    include: { sensorType: true },
    orderBy: { readingTime: 'asc' },
    take: MAX_HISTORY_ROWS,
  });
}

module.exports = { getLatestReadings, getHistory };
