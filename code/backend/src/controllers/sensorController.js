import prisma from '../lib/prisma.js';
import { Point } from '@influxdata/influxdb-client';
import { writeApi, queryApi } from '../lib/influx.js';

// (Optional) HTTP route for testing via Postman — ESP32 now uses MQTT instead.
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

  try {
    let accessWhere = null;

    if (req.user.role === "ADMIN") {
      accessWhere = { tankId, adminId: req.user.userId };
    } else if (req.user.role === "USER") {
      accessWhere = { tankId, workerIds: { has: req.user.userId } };
    } else {
      return res.status(403).json({ error: "SUPER_ADMIN has no tank access." });
    }

    const tank = await prisma.tank.findFirst({
      where: accessWhere,
      select: { id: true },
    });

    if (!tank) {
      return res.status(404).json({ error: "Tank not found or no access." });
    }

    // Sanitise tankId to prevent Flux injection
    const safeTankId = tankId.replace(/[^a-zA-Z0-9_-]/g, '');

    const fluxQuery = `
      from(bucket: "${process.env.INFLUX_BUCKET}")
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "water_quality")
        |> filter(fn: (r) => r.tankId == "${safeTankId}")
        |> aggregateWindow(every: 5m, fn: last, createEmpty: true)
        |> fill(usePrevious: true)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    const historyData = [];

    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const dataObject = tableMeta.toObject(row);

        if (dataObject.temperature || dataObject.pH) {
          historyData.push({
            time: dataObject._time,
            temp: dataObject.temperature || null,
            pH: dataObject.pH || null,
            tds: dataObject.tds || null,
            turbidity: dataObject.turbidity || null,
            waterLevel: dataObject.waterLevel || null,
          });
        }
      },
      error(error) {
        console.error("Influx query error:", error);
        res.status(500).json({ error: "Failed to fetch historical data." });
      },
      complete() {
        res.status(200).json(historyData);
      },
    });
  } catch (error) {
    console.error("History access check error:", error);
    return res.status(500).json({ error: "Failed to fetch historical data." });
  }
};