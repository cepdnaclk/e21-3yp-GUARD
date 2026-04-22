import mqtt from 'mqtt';
import 'dotenv/config'; 

// ==========================================
// ⚙️ SIMULATOR CONFIGURATION
// ==========================================
// Use existing tank IDs from env: SIM_TANK_IDS=GUARD-001,GUARD-002
// Fallback to one common ID if env is not set.
const TANK_IDS = (process.env.SIM_TANK_IDS || 'GUARD-001')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const client = mqtt.connect('mqtt://localhost:1883', {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD
});

// Helper to get exact timestamp: "2026-04-22 15:54:45"
const getTimestamp = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

// Helper to generate a random float with 2 decimal places
const getRandom = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

client.on('connect', () => {
    console.log(`\n🚀 Simulator connected to MQTT Broker!`);
    console.log(`🤖 Using existing tanks: ${TANK_IDS.join(', ')}\n`);

    // Boot up the virtual devices!
    for (const tankId of TANK_IDS) {
        startVirtualDevice(tankId);
    }
});

function startVirtualDevice(tankId) {
    // Add a tiny random delay to start times so they don't all fire on the exact same millisecond
    const startupDelay = Math.random() * 5000; 

    setTimeout(() => {
        console.log(`   ✅ Virtual Tank [${tankId}] is online and sending data.`);

        // TASK 1: Fast Sensors (Temperature & Water Level Every 10 seconds)
        setInterval(() => {
            const tempPayload = JSON.stringify({ value: getRandom(25.0, 28.0), time: getTimestamp() });
            const levelPayload = JSON.stringify({ value: getRandom(80.0, 100.0), time: getTimestamp() });

            client.publish(`sensor/${tankId}/temperature`, tempPayload);
            client.publish(`sensor/${tankId}/waterlevel`, levelPayload);
        }, 10000);

    }, startupDelay);
}