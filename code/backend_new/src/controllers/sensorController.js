import prisma from '../lib/prisma.js';
import { InfluxDB, Point } from '@influxdata/influxdb-client';

// Initialize the InfluxDB client
const influx = new InfluxDB({ url: process.env.INFLUX_URL, token: process.env.INFLUX_TOKEN });
const writeApi = influx.getWriteApi(process.env.INFLUX_ORG, process.env.INFLUX_BUCKET, 'ns');
const queryApi = influx.getQueryApi(process.env.INFLUX_ORG);

// (Optional) You can keep this HTTP route if you ever want to test via Postman, 
// even though your ESP32 now uses MQTT instead of this!
export const logData = async (req, res) => {
    const { tankId, temp, pH, tds, turbidity, waterLevel } = req.body;

    try {
        const updatedTank = await prisma.tank.update({
            where: { tankId },
            data: {
                lastTemp: temp,
                lastPh: pH,
                lastTds: tds,
                lastTurb: turbidity,
                lastWaterLevel: waterLevel, 
                status: "online"
            }
        });

        const point = new Point('water_quality')
            .tag('tankId', tankId)           
            .floatField('temperature', temp)
            .floatField('pH', pH)
            .floatField('tds', tds)
            .floatField('turbidity', turbidity)
            .floatField('waterLevel', waterLevel); 

        writeApi.writePoint(point);
        await writeApi.flush(); 

        res.status(201).json({ 
            message: "Hybrid sync complete: State in Mongo, History in Influx!", 
            currentStatus: updatedTank.status 
        });

    } catch (error) {
        console.error("Hybrid Sync Error:", error);
        res.status(500).json({ error: "Failed to log sensor data to databases." });
    }
};

// Fetch historical data for frontend charts
export const getTankHistory = async (req, res) => {
    const { tankId } = req.params;
    
    // THE FIX: Added aggregateWindow and fill() to stitch the staggered MQTT data together!
    const fluxQuery = `
        from(bucket: "${process.env.INFLUX_BUCKET}")
          |> range(start: -24h)
          |> filter(fn: (r) => r._measurement == "water_quality")
          |> filter(fn: (r) => r.tankId == "${tankId}")
          |> aggregateWindow(every: 5m, fn: last, createEmpty: true)
          |> fill(usePrevious: true)
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    const historyData = [];

    // Execute the query
    queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
            const dataObject = tableMeta.toObject(row);
            
            // Only push the row if it actually has data (cleans up empty start-of-day buckets)
            if (dataObject.temperature || dataObject.pH) {
                historyData.push({
                    time: dataObject._time,
                    temp: dataObject.temperature || null,
                    pH: dataObject.pH || null,
                    tds: dataObject.tds || null,
                    turbidity: dataObject.turbidity || null,
                    waterLevel: dataObject.waterLevel || null
                });
            }
        },
        error(error) {
            console.error("Influx Query Error:", error);
            res.status(500).json({ error: "Failed to fetch historical data" });
        },
        complete() {
            // Send the beautiful, stitched JSON array back to the frontend!
            res.status(200).json(historyData);
        },
    });
};