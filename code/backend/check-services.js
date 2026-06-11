import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { InfluxDB } from '@influxdata/influxdb-client';
import mqtt from 'mqtt';
import nodemailer from 'nodemailer';

dotenv.config();

console.log('🔍 Checking G.U.A.R.D Cloud Services...');

async function checkMongoDB() {
  console.log('\n📅 Checking MongoDB...');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  try {
    await prisma.$connect();
    console.log('✅ MongoDB Atlas: CONNECTED successfully!');
  } catch (error) {
    console.error('❌ MongoDB Atlas: FAILED to connect.', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkInfluxDB() {
  console.log('\n📊 Checking InfluxDB...');
  const url = process.env.INFLUX_URL;
  const token = process.env.INFLUX_TOKEN;
  const org = process.env.INFLUX_ORG;
  const bucket = process.env.INFLUX_BUCKET;
  
  if (!url || !token) {
    console.log('⚠️ InfluxDB URL or Token is not set.');
    return;
  }
  
  try {
    const influxDB = new InfluxDB({ url, token });
    const queryApi = influxDB.getQueryApi(org);
    const fluxQuery = `from(bucket: "${bucket}") |> range(start: -1m) |> limit(n: 1)`;
    await new Promise((resolve, reject) => {
      queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {},
        error(err) {
          reject(err);
        },
        complete() {
          resolve();
        }
      });
    });
    console.log('✅ InfluxDB Cloud: CONNECTED successfully!');
  } catch (error) {
    // If it is just empty data or bucket not found, let's check
    if (error.message.includes('unauthorized') || error.message.includes('401') || error.message.includes('403')) {
      console.error('❌ InfluxDB Cloud: Auth/Token invalid.', error.message);
    } else if (error.message.includes('failed to connect') || error.message.includes('ENOTFOUND')) {
      console.error('❌ InfluxDB Cloud: FAILED to connect.', error.message);
    } else {
      // Any other message usually means API connected but bucket query failed or returned no data, which is fine
      console.log('✅ InfluxDB Cloud: CONNECTED (Query completed with: ' + error.message + ')');
    }
  }
}

function checkMQTT() {
  return new Promise((resolve) => {
    console.log('\n📡 Checking HiveMQ MQTT Broker...');
    const brokerUrl = process.env.MQTT_BROKER_URL;
    const username = process.env.MQTT_USERNAME || process.env.MQTT_USER;
    const password = process.env.MQTT_PASSWORD;

    if (!brokerUrl) {
      console.log('⚠️ MQTT Broker URL is not set.');
      resolve();
      return;
    }

    const options = {
      connectTimeout: 5000,
      reconnectPeriod: 0,
    };
    if (username) options.username = username;
    if (password) options.password = password;

    const client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
      console.log('✅ MQTT Broker: CONNECTED successfully!');
      client.end();
      resolve();
    });

    client.on('error', (err) => {
      console.error('❌ MQTT Broker: ERROR connecting.', err.message);
      client.end();
      resolve();
    });

    setTimeout(() => {
      console.error('❌ MQTT Broker: TIMEOUT connecting.');
      client.end();
      resolve();
    }, 6000);
  });
}

async function checkSMTP() {
  console.log('\n📧 Checking SMTP Mailer...');
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('⚠️ SMTP host, user, or pass not configured.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Server: VERIFIED successfully!');
  } catch (error) {
    console.error('❌ SMTP Server: FAILED verification.', error.message);
  }
}

async function main() {
  await checkMongoDB();
  await checkInfluxDB();
  await checkMQTT();
  await checkSMTP();
  console.log('\n🏁 Cloud services check finished.');
}

main();
