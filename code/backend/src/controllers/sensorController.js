import prisma from '../lib/prisma.js';
import { Point } from '@influxdata/influxdb-client';
import { writeApi, queryApi } from '../lib/influx.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../lib/AppError.js';

// (Optional) HTTP route for testing via Postman — ESP32 now uses MQTT instead.
export const logData = asyncHandler(async (req, res) => {
  const { tankId, temp, pH, tds, turbidity, waterLevel } = req.body;

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
});

// Fetch historical data for frontend charts
export const getTankHistory = asyncHandler(async (req, res) => {
  const { tankId } = req.params;
  const { from, to } = req.query;

  let accessWhere = null;

  if (req.user.role === "ADMIN") {
    accessWhere = { tankId, adminId: req.user.userId };
  } else if (req.user.role === "USER") {
    accessWhere = { tankId, workerIds: { has: req.user.userId } };
  } else {
    throw new AppError("Access denied.", 403);
  }

  const tank = await prisma.tank.findFirst({
    where: accessWhere,
    select: { id: true },
  });

  if (!tank) {
    throw new AppError("Tank not found or no access.", 404);
  }

  // Sanitise tankId to prevent Flux injection
  const safeTankId = tankId.replace(/[^a-zA-Z0-9_-]/g, '');

  let rangeClause = '|> range(start: -24h)';

  if (from || to) {
    const parsedFrom = from ? new Date(from) : null;
    const parsedTo = to ? new Date(to) : null;

    if ((parsedFrom && Number.isNaN(parsedFrom.getTime())) || (parsedTo && Number.isNaN(parsedTo.getTime()))) {
      throw new AppError('Invalid from/to date format.', 400);
    }

    if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
      throw new AppError('"from" must be earlier than "to".', 400);
    }

    if (parsedFrom && parsedTo) {
      rangeClause = `|> range(start: ${parsedFrom.toISOString()}, stop: ${parsedTo.toISOString()})`;
    } else if (parsedFrom) {
      rangeClause = `|> range(start: ${parsedFrom.toISOString()})`;
    } else if (parsedTo) {
      rangeClause = `|> range(start: -30d, stop: ${parsedTo.toISOString()})`;
    }
  }

  // 1. Calculate dynamic sampling interval based on range
  const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();
  const diffHours = (toDate - fromDate) / (1000 * 60 * 60);

  let every = '5m';
  if (diffHours > 24 * 365) {      // > 1 year
    every = '7d';
  } else if (diffHours > 24 * 120) { // > 4 months
    every = '1d';
  } else if (diffHours > 24 * 30) { // > 1 month
    every = '6h';
  } else if (diffHours > 24 * 7) {  // > 1 week
    every = '1h';
  } else if (diffHours > 24) {      // > 1 day
    every = '15m';
  }

  const fluxQuery = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      ${rangeClause}
      |> filter(fn: (r) => r._measurement == "water_quality")
      |> filter(fn: (r) => r.tankId == "${safeTankId}")
      |> aggregateWindow(every: ${every}, fn: last, createEmpty: true)
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  `;

  const historyData = [];

  await new Promise((resolve, reject) => {
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
            temp: dataObject.temperature ?? null,
            pH: dataObject.pH ?? null,
            tds: dataObject.tds ?? null,
            turbidity: dataObject.turbidity ?? null,
            waterLevel: dataObject.waterLevel ?? null,
          });
        }
      },
      error(error) {
        console.error("❌ Influx Query Error Details:", {
          message: error.message,
          stack: error.stack,
          query: fluxQuery
        });
        reject(new AppError(`InfluxDB Error: ${error.message}`, 500));
      },
      complete() {
        resolve();
      },
    });
  });

  return res.status(200).json(historyData);
});