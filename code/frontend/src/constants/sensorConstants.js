/**
 * Canonical sensor metadata for the entire frontend.
 *
 * Previously duplicated as:
 *   - SENSOR_FIELDS     in api.js
 *   - SENSOR_META       in Dashboard.jsx
 *   - SENSOR_UNITS      in DeviceDetail.jsx
 *   - SENSOR_TYPES      in SensorHistory.jsx
 *   - SENSOR_LINE_CONFIG in SensorHistory.jsx
 *   - SERIES            in TankTimeSeriesChart.jsx
 */

// ---------- Core field list (used by the API service layer) ----------

export const SENSOR_FIELDS = [
  ['temp', 'Temperature'],
  ['pH', 'pH'],
  ['tds', 'TDS'],
  ['turbidity', 'Turbidity'],
  ['waterLevel', 'Water Level'],
];

// ---------- Dashboard gauge metadata ----------

export const SENSOR_META = {
  temperature: { label: 'TEMP', unit: '°C', minKey: 'tempMin', maxKey: 'tempMax', rMin: 0, rMax: 50 },
  ph:          { label: 'pH',   unit: '',   minKey: 'phMin',   maxKey: 'phMax',   rMin: 0, rMax: 14 },
  tds:         { label: 'TDS',  unit: 'ppm', minKey: 'tdsMin', maxKey: 'tdsMax',  rMin: 0, rMax: 2000 },
  turbidity:   { label: 'TURB', unit: 'NTU', maxKey: 'turbidityMax',              rMin: 0, rMax: 1000 },
  waterlevel:  { label: 'LEVEL', unit: 'cm', minKey: 'waterLevelThreshold', maxKey: 'waterStopThreshold', rMin: 0, rMax: 200, isInverted: true },
};

// ---------- Device-detail unit lookup ----------

export const SENSOR_UNITS = {
  temperature:  '°C',
  ph:           '',
  turbidity:    'NTU',
  'water level': '%',
  waterlevel:   '%',
  tds:          'ppm',
};

// ---------- Sensor-type list for filter dropdowns ----------

export const SENSOR_TYPES = [
  { id: 'temp',       sensorName: 'Temperature' },
  { id: 'pH',         sensorName: 'pH' },
  { id: 'tds',        sensorName: 'TDS' },
  { id: 'turbidity',  sensorName: 'Turbidity' },
  { id: 'waterLevel', sensorName: 'Water Level' },
];

// ---------- Chart line configuration ----------

export const SENSOR_LINE_CONFIG = {
  temp:       { key: 'temp',       label: 'Temperature', color: '#2563eb', unit: '°C' },
  pH:         { key: 'pH',         label: 'pH',          color: '#7c3aed', unit: '' },
  tds:        { key: 'tds',        label: 'TDS',         color: '#0f766e', unit: 'ppm' },
  turbidity:  { key: 'turbidity',  label: 'Turbidity',   color: '#ea580c', unit: 'NTU' },
  waterLevel: { key: 'waterLevel', label: 'Water Level', color: '#16a34a', unit: '%' },
};

// ---------- Sensor-ID to chart-data field mapping ----------

export const SENSOR_ID_TO_FIELD = {
  temp:       'temp',
  pH:         'pH',
  tds:        'tds',
  turbidity:  'turbidity',
  waterLevel: 'waterLevel',
};
