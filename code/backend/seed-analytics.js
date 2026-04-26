import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import prisma from './src/lib/prisma.js';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const usersSeed = {
  admin: {
    username: 'analytics_admin',
    email: 'analytics_admin@example.com',
    fullName: 'Analytics Admin',
    phoneNumber: '0710000001',
    address: 'Central Ops Office',
    role: 'ADMIN',
    password: 'Admin@1234',
  },
  workers: [
    {
      username: 'analytics_worker_1',
      email: 'analytics_worker_1@example.com',
      fullName: 'Worker One',
      phoneNumber: '0710000002',
      address: 'Site A',
      role: 'USER',
      password: 'Worker@1234',
    },
    {
      username: 'analytics_worker_2',
      email: 'analytics_worker_2@example.com',
      fullName: 'Worker Two',
      phoneNumber: '0710000003',
      address: 'Site B',
      role: 'USER',
      password: 'Worker@1234',
    },
  ],
};

const tanksSeed = [
  {
    tankId: 'GUARD-101',
    name: 'Tilapia Tank Alpha',
    workerUsernames: ['analytics_worker_1'],
    tempMin: 24,
    tempMax: 28,
    phMin: 6.5,
    phMax: 8.2,
    tdsMin: 220,
    tdsMax: 560,
    turbidityMax: 22,
    current: { temp: 26.1, pH: 7.3, tds: 390, turbidity: 12, waterLevel: 78, status: 'online' },
  },
  {
    tankId: 'GUARD-102',
    name: 'Shrimp Tank Bravo',
    workerUsernames: ['analytics_worker_1', 'analytics_worker_2'],
    tempMin: 25,
    tempMax: 29,
    phMin: 7.0,
    phMax: 8.5,
    tdsMin: 260,
    tdsMax: 640,
    turbidityMax: 18,
    current: { temp: 29.6, pH: 8.7, tds: 690, turbidity: 26, waterLevel: 63, status: 'online' },
  },
  {
    tankId: 'GUARD-103',
    name: 'Carp Tank Charlie',
    workerUsernames: ['analytics_worker_2'],
    tempMin: 23,
    tempMax: 27,
    phMin: 6.8,
    phMax: 8.0,
    tdsMin: 200,
    tdsMax: 520,
    turbidityMax: 20,
    current: { temp: 24.8, pH: 7.1, tds: 340, turbidity: 14, waterLevel: 82, status: 'online' },
  },
];

function buildHistoryValue(base, amplitude, angle, drift = 0) {
  return base + amplitude * Math.sin(angle) + drift;
}

function buildHistoricalPoints(tankId, hoursBack = 24, stepMinutes = 15) {
  const points = [];
  const now = Date.now();
  const totalSteps = Math.floor((hoursBack * 60) / stepMinutes);

  for (let i = totalSteps; i >= 0; i -= 1) {
    const timestamp = new Date(now - i * stepMinutes * MINUTE);
    const t = (totalSteps - i) / totalSteps;
    const angle = t * Math.PI * 4;

    const temperature = Number(buildHistoryValue(26, 1.6, angle, t * 0.3).toFixed(2));
    const pH = Number(buildHistoryValue(7.2, 0.45, angle + 0.9).toFixed(2));
    const tds = Number(buildHistoryValue(390, 85, angle + 1.7).toFixed(2));
    const turbidity = Number(buildHistoryValue(14, 4.8, angle + 2.5).toFixed(2));
    const waterLevel = Number(buildHistoryValue(78, 6.5, angle + 1.1, -t * 2.5).toFixed(2));

    const point = new Point('water_quality')
      .tag('tankId', tankId)
      .floatField('temperature', temperature)
      .floatField('pH', pH)
      .floatField('tds', tds)
      .floatField('turbidity', turbidity)
      .floatField('waterLevel', waterLevel)
      .timestamp(timestamp);

    points.push(point);
  }

  return points;
}

async function upsertUser(user, adminId = null) {
  const hash = await bcrypt.hash(user.password, 10);

  return prisma.user.upsert({
    where: { username: user.username },
    update: {
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      address: user.address,
      role: user.role,
      adminId,
      password: hash,
    },
    create: {
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      address: user.address,
      role: user.role,
      adminId,
      assignedTankIds: [],
      password: hash,
    },
  });
}

async function run() {
  console.log('Seeding analytics demo data...');

  const admin = await upsertUser(usersSeed.admin);
  const workers = [];

  for (const workerSeed of usersSeed.workers) {
    const worker = await upsertUser(workerSeed, admin.id);
    workers.push(worker);
  }

  const workerByUsername = new Map(workers.map((w) => [w.username, w]));
  const tanks = [];

  for (const tankSeed of tanksSeed) {
    const workerIds = tankSeed.workerUsernames
      .map((username) => workerByUsername.get(username))
      .filter(Boolean)
      .map((worker) => worker.id);

    const tank = await prisma.tank.upsert({
      where: { tankId: tankSeed.tankId },
      update: {
        name: tankSeed.name,
        adminId: admin.id,
        workerIds,
        tempMin: tankSeed.tempMin,
        tempMax: tankSeed.tempMax,
        phMin: tankSeed.phMin,
        phMax: tankSeed.phMax,
        tdsMin: tankSeed.tdsMin,
        tdsMax: tankSeed.tdsMax,
        turbidityMax: tankSeed.turbidityMax,
        lastTemp: tankSeed.current.temp,
        lastPh: tankSeed.current.pH,
        lastTds: tankSeed.current.tds,
        lastTurb: tankSeed.current.turbidity,
        lastWaterLevel: tankSeed.current.waterLevel,
        status: tankSeed.current.status,
      },
      create: {
        tankId: tankSeed.tankId,
        name: tankSeed.name,
        adminId: admin.id,
        workerIds,
        tempMin: tankSeed.tempMin,
        tempMax: tankSeed.tempMax,
        phMin: tankSeed.phMin,
        phMax: tankSeed.phMax,
        tdsMin: tankSeed.tdsMin,
        tdsMax: tankSeed.tdsMax,
        turbidityMax: tankSeed.turbidityMax,
        lastTemp: tankSeed.current.temp,
        lastPh: tankSeed.current.pH,
        lastTds: tankSeed.current.tds,
        lastTurb: tankSeed.current.turbidity,
        lastWaterLevel: tankSeed.current.waterLevel,
        status: tankSeed.current.status,
      },
    });

    tanks.push(tank);
  }

  for (const worker of workers) {
    const assignedTankIds = tanks
      .filter((tank) => tank.workerIds.includes(worker.id))
      .map((tank) => tank.id);

    await prisma.user.update({
      where: { id: worker.id },
      data: { assignedTankIds },
    });
  }

  let influxPointsWritten = 0;

  const hasInfluxEnv =
    process.env.INFLUX_URL &&
    process.env.INFLUX_TOKEN &&
    process.env.INFLUX_ORG &&
    process.env.INFLUX_BUCKET;

  if (hasInfluxEnv) {
    try {
      const influx = new InfluxDB({
        url: process.env.INFLUX_URL,
        token: process.env.INFLUX_TOKEN,
      });
      const writeApi = influx.getWriteApi(process.env.INFLUX_ORG, process.env.INFLUX_BUCKET, 'ns');

      for (const tank of tanks) {
        const points = buildHistoricalPoints(tank.tankId, 24, 15);
        influxPointsWritten += points.length;
        writeApi.writePoints(points);
      }

      await writeApi.flush();
      await writeApi.close();
    } catch (error) {
      console.warn(`Influx write skipped: ${error.message}`);
      influxPointsWritten = 0;
    }
  } else {
    console.warn('Influx env missing; skipped time-series seed.');
  }

  const [userCount, tankCount] = await Promise.all([
    prisma.user.count(),
    prisma.tank.count(),
  ]);

  console.log('Analytics seed complete.');
  console.log(`Users in DB: ${userCount}`);
  console.log(`Tanks in DB: ${tankCount}`);
  console.log(`Influx points written: ${influxPointsWritten}`);
  console.log('Seeded credentials:');
  console.log(`ADMIN -> ${usersSeed.admin.username} / ${usersSeed.admin.password}`);
  console.log(`USER  -> ${usersSeed.workers[0].username} / ${usersSeed.workers[0].password}`);
}

run()
  .catch((error) => {
    console.error('Analytics seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
