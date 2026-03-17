const mqtt = require('mqtt');

const brokerHost = process.env.BROKER_HOST || 'localhost';
const brokerPort = process.env.BROKER_PORT || '1883';
const deviceId = process.env.DEVICE_ID || '100';
const sensorName = process.env.SENSOR_NAME || 'temperature';

const topic = `sensor/${deviceId}/${sensorName}`;
const client = mqtt.connect(`mqtt://${brokerHost}:${brokerPort}`);

client.on('connect', () => {
  console.log(`[MQTT] Connected to mqtt://${brokerHost}:${brokerPort}`);
  client.subscribe(topic, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[MQTT] Subscribe failed: ${err.message}`);
      return;
    }
    console.log(`[MQTT] Subscribed to ${topic}`);
  });
});

client.on('message', (_topic, message) => {
  const raw = message.toString();
  try {
    const payload = JSON.parse(raw);
    console.log(`[DATA] topic=${_topic} value=${payload.value} time=${payload.time || 'N/A'}`);
  } catch {
    console.log(`[DATA] topic=${_topic} raw=${raw}`);
  }
});

client.on('error', (err) => {
  console.error(`[MQTT] Error: ${err.message}`);
});