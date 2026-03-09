const mqtt = require('mqtt');
const express = require('express');

const app = express();
const port = 3000; // Web dashboard port

// Your PC IP and broker port
const broker_ip = '192.168.166.193'; // replace with your PC IP
const client = mqtt.connect(`mqtt://${broker_ip}:1883`);

let latestTemperature = null;

// MQTT connection
client.on('connect', () => {
  console.log('Connected to MQTT broker!');
  client.subscribe('sensor/temperature', (err) => {
    if (!err) console.log('Subscribed to topic: sensor/temperature');
  });
});

// MQTT message handler
client.on('message', (topic, message) => {
  const msg = message.toString();
  console.log(`Received on ${topic}: ${msg}`);
  latestTemperature = msg; // store latest temperature
});

// Simple web dashboard
app.get('/', (req, res) => {
  res.send(`
    <h1>ESP32 Temperature Dashboard</h1>
    <p>Latest Temperature: ${latestTemperature ? latestTemperature : 'No data yet'}</p>
  `);
});

app.listen(port, () => {
  console.log(`Dashboard running at http://localhost:${port}`);
});