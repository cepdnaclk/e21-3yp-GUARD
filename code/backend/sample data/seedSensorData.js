import 'dotenv/config';
import prisma from '../src/lib/prisma.js';
import { InfluxDB, Point } from '@influxdata/influxdb-client';

// Influx setup
const influx = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});

const writeApi = influx.getWriteApi(
  process.env.INFLUX_ORG,
  process.env.INFLUX_BUCKET,
  'ns'
);

// 🔢 Helper to generate random values in range
const random = (min, max) => Number((Math.random() * (max - min) + min).toFixed(2));

async function seedSensorData() {
  console.log("🌱 Seeding sensor data...");

  try {
    // 1️⃣ Get all tanks
    const tanks = await prisma.tank.findMany();

    if (tanks.length === 0) {
      console.log("❌ No tanks found. Seed tanks first.");
      return;
    }

    // 2️⃣ Loop tanks
    for (const tank of tanks) {
      console.log(`➡️ Generating data for ${tank.tankId}`);

      // generate 20 readings per tank
      for (let i = 0; i < 20; i++) {
        const temp = random(24, 30);
        const pH = random(6.5, 8.5);
        const tds = random(200, 600);
        const turbidity = random(5, 25);
        const waterLevel = random(60, 100);

        // 📊 Write to InfluxDB (history)
        const point = new Point('water_quality')
          .tag('tankId', tank.tankId)
          .floatField('temperature', temp)
          .floatField('pH', pH)
          .floatField('tds', tds)
          .floatField('turbidity', turbidity)
          .floatField('waterLevel', waterLevel)
          // simulate past timestamps (last few hours)
          .timestamp(new Date(Date.now() - (20 - i) * 5 * 60 * 1000));

        writeApi.writePoint(point);

        // 🗄️ Update latest state in Mongo (only last iteration)
        if (i === 19) {
          await prisma.tank.update({
            where: { id: tank.id },
            data: {
              lastTemp: temp,
              lastPh: pH,
              lastTds: tds,
              lastTurb: turbidity,
              lastWaterLevel: waterLevel,
              status: "online",
            },
          });
        }
      }
    }

    // flush once at end (important)
    await writeApi.flush();

    console.log("✅ Sensor data seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding sensor data:", error);
  } finally {
    try {
      await writeApi.close();
    } catch {
      // Ignore close errors during shutdown.
    }
    await prisma.$disconnect();
  }
}

seedSensorData();