import mqtt from 'mqtt';
import prisma from '../lib/prisma.js';
import { InfluxDB, Point } from '@influxdata/influxdb-client';

const influx = new InfluxDB({ url: process.env.INFLUX_URL, token: process.env.INFLUX_TOKEN });
const writeApi = influx.getWriteApi(process.env.INFLUX_ORG, process.env.INFLUX_BUCKET, 'ns');

export const initMqtt = () => {
    const client = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883', {
        username: process.env.MQTT_USERNAME || process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD
    }); 

    client.on('connect', () => {
        console.log('📡 MQTT Broker connected successfully!');
        client.subscribe('sensor/+/+', (err) => {
            if (!err) console.log('✅ Listening for individual sensor topics (sensor/+/+) via MQTT...');
        });
    });

    client.on('message', async (topic, message) => {
        const topicParts = topic.split('/');
        
        const tankId = topicParts[1];       
        const sensorType = topicParts[2];   

        try {
            // THE FIX: Parse the JSON object and extract the "value" property
            const payload = JSON.parse(message.toString());
            const sensorValue = parseFloat(payload.value);
            
            // Note: We are ignoring payload.time for now and letting the Node.js server 
            // automatically stamp the exact arrival time. This prevents tricky timezone bugs!

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
            const tank = await prisma.tank.findUnique({ where: { tankId } });
            if (tank) {
                await prisma.tank.update({
                    where: { tankId },
                    data: mongoData
                });
            } else {
                console.warn(`⚠️ Tank ${tankId} not found in MongoDB. Skipping MQTT update.`);
                // We still write to InfluxDB if we want history for unregistered tanks, 
                // but usually we only want it for registered ones. 
                // Let's only write to Influx if tank exists.
            }

            if (tank) {
                // TASK B: Update InfluxDB 
                const point = new Point('water_quality')
                    .tag('tankId', tankId)
                    .floatField(influxFieldName, sensorValue);

                writeApi.writePoint(point);
                await writeApi.flush();

                console.log(`⚡ MQTT sync: Tank ${tankId} -> [${sensorType}] updated to ${sensorValue}`);
            }

        } catch (error) {
            console.error(`❌ MQTT Error for Tank ${tankId}:`, error.message);
        }
    });
};