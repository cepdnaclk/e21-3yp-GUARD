import mqtt from 'mqtt';
import prisma from '../lib/prisma.js';
import { InfluxDB, Point } from '@influxdata/influxdb-client';

const influx = new InfluxDB({ url: process.env.INFLUX_URL, token: process.env.INFLUX_TOKEN });
const writeApi = influx.getWriteApi(process.env.INFLUX_ORG, process.env.INFLUX_BUCKET, 'ns');
let mqttClient = null;

export const initMqtt = () => {
    // Read the broker URL from .env, fallback to localhost if not found
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    
    const client = mqtt.connect(brokerUrl, {
        username: process.env.MQTT_USERNAME || process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD,
        clientId: `GUARD_Backend_${Math.random().toString(16).slice(3)}`,
        rejectUnauthorized: true // Enforces strict SSL/TLS verification for HiveMQ Cloud
    });
    mqttClient = client;

    client.on('connect', () => {
        console.log(`☁️  MQTT Broker connected successfully to ${brokerUrl}!`);
        client.subscribe('sensor/+/+', (err) => {
            if (!err) console.log('✅ Listening for individual sensor topics (sensor/+/+) via HiveMQ...');
        });
    });

    client.on('message', async (topic, message) => {
        const topicParts = topic.split('/');
        
        const tankId = topicParts[1];       
        const sensorType = topicParts[2];   

        try {
            const payload = JSON.parse(message.toString());
            const sensorValue = parseFloat(payload.value);
            
            let mongoData = { status: "online" }; 
            let influxFieldName = "";

            switch (sensorType) {
                case 'temperature':
                    mongoData.lastTemp = sensorValue;
                    influxFieldName = 'temperature';
                    break;
                case 'ph':
                    mongoData.lastPh = sensorValue;
                    influxFieldName = 'pH';
                    break;
                case 'tds':
                    mongoData.lastTds = sensorValue;
                    influxFieldName = 'tds';
                    break;
                case 'turbidity':
                    mongoData.lastTurb = sensorValue;
                    influxFieldName = 'turbidity';
                    break;
                case 'waterlevel':
                    mongoData.lastWaterLevel = sensorValue;
                    influxFieldName = 'waterLevel';
                    break;
                default:
                    console.log(`⚠️ Unknown sensor topic: ${sensorType}`);
                    return; 
            }

            // TASK A: Update MongoDB (only if tank is registered)
            const tankExists = await prisma.tank.findUnique({
                where: { tankId }
            });

            if (!tankExists) {
                console.log(`⚠️ Ignored MQTT message for unregistered Tank: ${tankId}`);
                return; // Stop processing if tank isn't in MongoDB
            }

            await prisma.tank.update({
                where: { tankId },
                data: mongoData
            });

            // TASK B: Update InfluxDB 
            const point = new Point('water_quality')
                .tag('tankId', tankId)
                .floatField(influxFieldName, sensorValue);

            writeApi.writePoint(point);
            await writeApi.flush();

            console.log(`⚡ MQTT sync: Tank ${tankId} -> [${sensorType}] updated to ${sensorValue}`);

        } catch (error) {
            console.error(`❌ MQTT Error for Tank ${tankId}:`, error.message);
        }
    });

    // Helpful error logging if HiveMQ rejects the connection
    client.on('error', (err) => {
        console.error('❌ MQTT Connection Error:', err.message);
    });
};

export const publishActuatorCommand = (topic, payload) => {
    if (!mqttClient || !mqttClient.connected) {
        throw new Error('MQTT broker is not connected.');
    }

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

    return new Promise((resolve, reject) => {
        mqttClient.publish(topic, message, { qos: 1 }, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
};