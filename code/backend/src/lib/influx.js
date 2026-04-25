import { InfluxDB } from '@influxdata/influxdb-client';

const influx = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN
});

const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

export const writeApi = influx.getWriteApi(org, bucket, 'ns', {
  batchSize: 50,
  flushInterval: 5000,       // flush every 5 seconds instead of per-message
  maxRetries: 3,
  retryJitter: 200,
});

export const queryApi = influx.getQueryApi(org);

export { influx };
