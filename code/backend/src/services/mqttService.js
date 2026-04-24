import mqtt from 'mqtt';
import prisma from '../lib/prisma.js';
import { InfluxDB, Point } from '@influxdata/influxdb-client';

const influx = new InfluxDB({ url: process.env.INFLUX_URL, token: process.env.INFLUX_TOKEN });
const writeApi = influx.getWriteApi(process.env.INFLUX_ORG, process.env.INFLUX_BUCKET, 'ns');
let mqttClient = null;

export const initMqtt = () => {
    // THE FIX: Secure TLS connection to HiveMQ Cloud
    const client = mqtt.connect('mqtts://71d3962284c44824be0bfe8cfedfedb7.s1.eu.hivemq.cloud:8883', {
        username: process.env.MQTT_USER,     // Make sure this is "thisen" in your .env
        password: process.env.MQTT_PASSWORD, // Make sure this is "Thisen123thi" in your .env
        clientId: `GUARD_Backend_${Math.random().toString(16).slice(3)}`, // Prevents cloud boot-loops
        rejectUnauthorized: true // Enforces strict SSL/TLS verification
    });
    mqttClient = client;

    client.on('connect', () => {
        console.log('☁️  MQTT Broker (HiveMQ Cloud) connected successfully!');
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

            // TASK A: Update MongoDB 
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