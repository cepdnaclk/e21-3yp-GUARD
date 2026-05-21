import { PrismaClient } from '@prisma/client';
import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function start() {
    console.log('🔍 Looking for a registered tank in the database...');
    // find a tank
    let tank = await prisma.tank.findFirst({
        where: { isRegistered: true }
    });

    if (!tank) {
        console.log('⚠️ No registered tanks found! Checking for any unregistered tank...');
        tank = await prisma.tank.findFirst();
        if (!tank) {
            console.log('❌ No tanks found in the database. Please create a tank first.');
            process.exit(1);
        }
    }

    const tankId = tank.tankId;
    console.log(`✅ Using tankId: ${tankId}`);

    const brokerUrl = process.env.MQTT_BROKER_URL;
    if (!brokerUrl) {
        console.log('❌ MQTT_BROKER_URL not found in .env');
        process.exit(1);
    }

    console.log(`🔄 Connecting to MQTT broker at ${brokerUrl}...`);
    const client = mqtt.connect(brokerUrl, {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clientId: `DummySensor_${Math.random().toString(16).slice(2, 8)}`,
        clean: true,
        rejectUnauthorized: true,
    });

    client.on('connect', () => {
        console.log('✅ Connected to MQTT broker!');
        console.log('📡 Starting to send dummy sensor data every 5 seconds...');
        console.log('Press Ctrl+C to stop.');
        
        setInterval(() => {
            const time = new Date().toISOString();
            
            // Random dummy values around standard safe ranges
            const temp = (Math.random() * 2 + 25).toFixed(2); // 25 - 27 °C
            const ph = (Math.random() * 1 + 7).toFixed(2); // 7.0 - 8.0
            const tds = (Math.floor(Math.random() * 100) + 300).toFixed(2); // 300 - 400 ppm
            const turbidity = (Math.random() * 5 + 5).toFixed(2); // 5 - 10 NTU
            const waterlevel = (Math.random() * 10 + 40).toFixed(2); // 40 - 50 cm

            client.publish(`sensor/${tankId}/temperature`, JSON.stringify({ value: temp, time }));
            client.publish(`sensor/${tankId}/ph`, JSON.stringify({ value: ph, time }));
            client.publish(`sensor/${tankId}/tds`, JSON.stringify({ value: tds, time }));
            client.publish(`sensor/${tankId}/turbidity`, JSON.stringify({ value: turbidity, time }));
            client.publish(`sensor/${tankId}/waterlevel`, JSON.stringify({ value: waterlevel, time }));

            console.log(`[${time}] Published data -> Temp: ${temp}, pH: ${ph}, TDS: ${tds}, Turb: ${turbidity}, WL: ${waterlevel}`);
        }, 5000); // every 5 seconds
    });

    client.on('error', (err) => {
        console.error('❌ MQTT Error:', err.message);
    });
}

start();
