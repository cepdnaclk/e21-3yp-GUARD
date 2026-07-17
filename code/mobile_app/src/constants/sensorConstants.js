export const SENSOR_FIELDS = [
  ['temp', 'Temperature'],
  ['pH', 'pH'],
  ['tds', 'TDS'],
  ['turbidity', 'Turbidity'],
  ['waterLevel', 'Water Level'],
];

export const SENSOR_META = {
  temperature: { label: 'TEMP', unit: '°C', minKey: 'tempMin', maxKey: 'tempMax', rMin: 0, rMax: 50 },
  ph:          { label: 'pH',   unit: '',   minKey: 'phMin',   maxKey: 'phMax',   rMin: 0, rMax: 14 },
  tds:         { label: 'TDS',  unit: 'ppm', minKey: 'tdsMin', maxKey: 'tdsMax',  rMin: 0, rMax: 2000 },
  turbidity:   { label: 'TURB', unit: 'NTU', maxKey: 'turbidityMax',              rMin: 0, rMax: 1000 },
  waterlevel:  { label: 'LEVEL', unit: 'cm', minKey: 'waterLevelThreshold', maxKey: 'waterStopThreshold', rMin: 0, rMax: 200, isInverted: true },
};
