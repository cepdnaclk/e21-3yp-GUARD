const mqtt = require('mqtt');

const brokerHost = process.argv[2] || 'localhost';
const brokerPort = process.argv[3] || '1883';
const topic = process.argv[4];
const value = process.argv[5];
const time = process.argv[6];

if (!topic || value === undefined || !time) {
  console.error('Usage: node publish.js <host> <port> <topic> <value> <time>');
  process.exit(1);
}

const client = mqtt.connect(`mqtt://${brokerHost}:${brokerPort}`);

client.on('connect', () => {
  const payload = JSON.stringify({ value: Number(value), time });
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[MQTT] Publish error: ${err.message}`);
      client.end(true);
      process.exit(1);
      return;
    }

    console.log(`[MQTT] Published: ${topic} -> ${payload}`);
    client.end(true, () => process.exit(0));
  });
});

client.on('error', (err) => {
  console.error(`[MQTT] Connection error: ${err.message}`);
  process.exit(1);
});
