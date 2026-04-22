import mqtt from 'mqtt';
import 'dotenv/config'; 

// ==========================================
// ⚙️ SIMULATOR CONFIGURATION
// ==========================================
const NUM_DEVICES = 10; // Exactly 10 tanks
const STARTING_ID = 200; // Tank IDs will be 200 to 209

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
    console.log(`🤖 Spawning ${NUM_DEVICES} virtual ESP32 devices (IDs: ${STARTING_ID} to ${STARTING_ID + NUM_DEVICES - 1})...\n`);

    // Boot up the virtual devices!
    for (let i = 0; i < NUM_DEVICES; i++) {
        const tankId = STARTING_ID + i;
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