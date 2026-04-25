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
  const { from, to } = req.query;

  try {
    let accessWhere = null;

    if (req.user.role === "ADMIN") {
      accessWhere = { tankId, adminId: req.user.userId };
    } else if (req.user.role === "USER") {
      accessWhere = { tankId, workerIds: { has: req.user.userId } };
    } else {
      return res.status(403).json({ error: "Access denied." });
    }

    const tank = await prisma.tank.findFirst({
      where: accessWhere,
      select: { id: true },
    });

    if (!tank) {
      return res.status(404).json({ error: "Tank not found or no access." });
    }

    let rangeClause = '|> range(start: -24h)';

    if (from || to) {
      const parsedFrom = from ? new Date(from) : null;
      const parsedTo = to ? new Date(to) : null;

      if ((parsedFrom && Number.isNaN(parsedFrom.getTime())) || (parsedTo && Number.isNaN(parsedTo.getTime()))) {
        return res.status(400).json({ error: 'Invalid from/to date format.' });
      }

      if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
        return res.status(400).json({ error: '"from" must be earlier than "to".' });
      }

      if (parsedFrom && parsedTo) {
        rangeClause = `|> range(start: time(v: "${parsedFrom.toISOString()}"), stop: time(v: "${parsedTo.toISOString()}"))`;
      } else if (parsedFrom) {
        rangeClause = `|> range(start: time(v: "${parsedFrom.toISOString()}"))`;
      } else if (parsedTo) {
        rangeClause = `|> range(start: -30d, stop: time(v: "${parsedTo.toISOString()}"))`;
      }
    }

    const fluxQuery = `
      from(bucket: "${process.env.INFLUX_BUCKET}")
        ${rangeClause}
        |> filter(fn: (r) => r._measurement == "water_quality")
        |> filter(fn: (r) => r.tankId == "${tankId}")
        |> aggregateWindow(every: 5m, fn: last, createEmpty: true)
        |> fill(usePrevious: true)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    const historyData = [];
    let responded = false;

    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const dataObject = tableMeta.toObject(row);

        const hasAnyValue =
          dataObject.temperature != null ||
          dataObject.pH != null ||
          dataObject.tds != null ||
          dataObject.turbidity != null ||
          dataObject.waterLevel != null;

        if (hasAnyValue) {
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
        if (responded) return;
        responded = true;
        console.error("Influx query error:", error);
        res.status(500).json({ error: "Failed to fetch historical data." });
      },
      complete() {
        if (responded) return;
        responded = true;
        res.status(200).json(historyData);
      },
    });
  } catch (error) {
    console.error("History access check error:", error);
    return res.status(500).json({ error: "Failed to fetch historical data." });
  }
};