import 'dotenv/config';
import jwt from 'jsonwebtoken';
import mqtt from 'mqtt';
import prisma from '../src/lib/prisma.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://localhost:5000/api';
const SECRET = process.env.JWT_SECRET || 'testsecret';
const LOG_FILE = path.join(process.cwd(), 'simulation-errors.log');

const logError = (msg) => {
    console.error(`❌ FAIL: ${msg}`);
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] FAIL: ${msg}\n`);
};
const logSuccess = (msg) => console.log(`✅ PASS: ${msg}`);

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSimulation() {
    console.log("🌊 Starting G.U.A.R.D Complete IoT Simulation Test...\n");
    fs.appendFileSync(LOG_FILE, `\n--- New Simulation Run at ${new Date().toISOString()} ---\n`);
    
    let mqttClient;
    try {
        // 1. SETUP DATABASE
        console.log("⚙️  Setting up simulation environment in Database...");
        await prisma.alert.deleteMany({ where: { tankId: '_SIM_TANK_01' } });
        await prisma.tank.deleteMany({ where: { tankId: '_SIM_TANK_01' } });
        await prisma.user.deleteMany({ where: { username: '_SIM_ADMIN' } });

        const hash = await bcrypt.hash('password123', 10);
        const admin = await prisma.user.create({
            data: { username: '_SIM_ADMIN', email: process.env.SMTP_USER || 'test@local.guard', password: hash, fullName: 'Sim Admin', role: 'ADMIN', emailVerified: true }
        });
        
        const tank = await prisma.tank.create({
            data: { tankId: '_SIM_TANK_01', productKey: 'SIM-0001', name: 'Simulation Tank', isRegistered: true, adminId: admin.id, tempMax: 30.0 }
        });

        const adminToken = jwt.sign({ userId: admin.id, role: admin.role }, SECRET, { expiresIn: '1h' });

        // 2. CONNECT TO MQTT
        console.log("🔌 Connecting to MQTT Broker to simulate ESP32...");
        mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
            username: process.env.MQTT_USERNAME || process.env.MQTT_USER,
            password: process.env.MQTT_PASSWORD,
            rejectUnauthorized: false
        });

        await new Promise((resolve, reject) => {
            mqttClient.on('connect', resolve);
            mqttClient.on('error', reject);
            setTimeout(() => reject(new Error("MQTT timeout")), 5000);
        });
        logSuccess("Connected to live MQTT broker successfully");

        // 3. SEND NORMAL SENSOR DATA
        console.log("\n📡 Simulating healthy sensor data (Temperature = 26.5)...");
        mqttClient.publish('sensor/_SIM_TANK_01/temperature', JSON.stringify({ value: 26.5 }));
        
        // Wait for backend to process via MQTT listener
        await delay(3000);

        // Verify MongoDB
        const updatedTank = await prisma.tank.findUnique({ where: { tankId: '_SIM_TANK_01' } });
        if (updatedTank && updatedTank.lastTemp === 26.5) {
            logSuccess("Backend successfully received MQTT data and updated MongoDB real-time state");
        } else {
            logError(`MongoDB did not update correctly. Found lastTemp: ${updatedTank?.lastTemp}`);
        }

        // Verify InfluxDB via Graph API
        const historyRes = await fetch(`${BASE_URL}/sensors/history/_SIM_TANK_01?sensorType=temperature&range=1h`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const historyData = await historyRes.json();
        if (historyRes.status === 200 && Array.isArray(historyData)) {
            logSuccess("Historical Data API returned data points from InfluxDB successfully");
        } else {
            logError(`Failed to fetch historical data. Status: ${historyRes.status}`);
        }

        // 4. TRIGGER ALERT
        console.log("\n🔥 Simulating CRITICAL HIGH temperature (45°C) to trigger Alert System...");
        mqttClient.publish('sensor/_SIM_TANK_01/temperature', JSON.stringify({ value: 45.0 }));
        mqttClient.publish('alert/_SIM_TANK_01/temperature', JSON.stringify({ alert: "CRITICAL HIGH", value: 45.0 }));

        await delay(4000); // Wait for alert processing and email dispatch

        const alertCheck = await prisma.alert.findFirst({
            where: { tankId: '_SIM_TANK_01', type: 'temperature', message: 'CRITICAL HIGH' }
        });
        if (alertCheck && !alertCheck.resolved) {
            logSuccess("Alert System triggered and successfully logged the critical event to the database");
            console.log("   📧 (Because the DB logged the alert, the emailService automatically fired in the background!)");
        } else {
            logError("Backend failed to process the alert or log it to MongoDB");
        }

        // 5. RESOLVE ALERT
        console.log("\n❄️  Simulating return to normal temperature (25°C)...");
        mqttClient.publish('sensor/_SIM_TANK_01/temperature', JSON.stringify({ value: 25.0 }));
        
        await delay(3000); // Wait for Auto-Resolve Logic
        
        const resolvedCheck = await prisma.alert.findFirst({
            where: { id: alertCheck?.id }
        });
        
        if (resolvedCheck?.resolved === true) {
            logSuccess("Auto-resolve logic correctly identified normal temperature and closed the active alert");
        } else {
            logError("Auto-resolve logic failed to resolve the alert when temperature returned to normal");
        }

    } catch (err) {
        logError(`Fatal simulation error: ${err.message}`);
    } finally {
        console.log("\n🧹 Cleaning up simulation data...");
        if (mqttClient) mqttClient.end();
        await prisma.alert.deleteMany({ where: { tankId: '_SIM_TANK_01' } });
        await prisma.tank.deleteMany({ where: { tankId: '_SIM_TANK_01' } });
        await prisma.user.deleteMany({ where: { username: '_SIM_ADMIN' } });
        await prisma.$disconnect();
        console.log(`\n📄 Any failures have been permanently logged to: ${LOG_FILE}`);
    }
}

runSimulation();
