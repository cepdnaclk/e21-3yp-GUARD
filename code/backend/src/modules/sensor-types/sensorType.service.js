'use strict';

const prisma = require('../../database/prismaClient');
const logger = require('../../utils/logger');

async function getSensorTypes() {
  return prisma.sensorType.findMany({
    orderBy: { id: 'asc' },
  });
}

async function createSensorType({ sensorName, frequency }) {
  const sensorType = await prisma.sensorType.create({
    data: { sensorName, frequency },
  });

  logger.info(`[SensorTypes] Created sensor type ${sensorType.id}: ${sensorType.sensorName}`);
  return sensorType;
}

async function getSensorTypeById(id) {
  return prisma.sensorType.findUnique({ where: { id } });
}

module.exports = { getSensorTypes, createSensorType, getSensorTypeById };
