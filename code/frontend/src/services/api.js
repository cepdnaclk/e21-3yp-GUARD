const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.errors?.[0]?.msg || data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

async function requestSoft(endpoint, options = {}, fallback = null) {
  try {
    return await request(endpoint, options);
  } catch {
    return fallback;
  }
}

function toDeviceFromTank(tank) {
  return {
    id: tank.id,
    deviceId: tank.tankId,
    deviceName: tank.name,
    createdAt: tank.createdAt,
    updatedAt: tank.updatedAt,
    status: tank.status,
    currentStats: {
      temp: tank.lastTemp,
      pH: tank.lastPh,
      tds: tank.lastTds,
      turbidity: tank.lastTurb,
      waterLevel: tank.lastWaterLevel,
    },
  };
}

// Auth
export const authApi = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  googleLogin: (idToken) => request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'POST', body: JSON.stringify(body) }),
};

// Devices
export const deviceApi = {
  list: async () => {
    const tanks = await request('/tanks');
    return Array.isArray(tanks) ? tanks.map(toDeviceFromTank) : [];
  },
  create: async (body) => {
    const payload = {
      tankId: String(body.deviceId),
      name: body.deviceName || `Tank ${body.deviceId}`,
    };
    const created = await request('/tanks/register', { method: 'POST', body: JSON.stringify(payload) });
    return created?.tank ? toDeviceFromTank(created.tank) : created;
  },
  get: async (id) => {
    const status = await request(`/tanks/${id}/status`);
    return {
      deviceId: status.tankId,
      deviceName: status.name,
      status: status.status,
      currentStats: status.currentStats || {},
    };
  },
};

// Sensor Types
export const sensorTypeApi = {
  list: async () => {
    const seed = [
      { id: 'temp', sensorName: 'Temperature' },
      { id: 'pH', sensorName: 'pH' },
      { id: 'tds', sensorName: 'TDS' },
      { id: 'turbidity', sensorName: 'Turbidity' },
      { id: 'waterLevel', sensorName: 'Water Level' },
    ];
    return requestSoft('/sensor-types', {}, seed);
  },
  create: (body) => request('/sensor-types', { method: 'POST', body: JSON.stringify(body) }),
  get: (id) => request(`/sensor-types/${id}`),
};

// Sensor Readings
export const sensorApi = {
  latest: async (deviceId) => {
    const status = await request(`/tanks/${deviceId}/status`);
    const stats = status.currentStats || {};

    return [
      { id: `${deviceId}-temperature`, sensorId: 'temperature', sensorType: { sensorName: 'Temperature' }, value: stats.temp, readingTime: new Date().toISOString() },
      { id: `${deviceId}-ph`, sensorId: 'pH', sensorType: { sensorName: 'pH' }, value: stats.pH, readingTime: new Date().toISOString() },
      { id: `${deviceId}-tds`, sensorId: 'tds', sensorType: { sensorName: 'TDS' }, value: stats.tds, readingTime: new Date().toISOString() },
      { id: `${deviceId}-turbidity`, sensorId: 'turbidity', sensorType: { sensorName: 'Turbidity' }, value: stats.turbidity, readingTime: new Date().toISOString() },
      { id: `${deviceId}-waterLevel`, sensorId: 'waterLevel', sensorType: { sensorName: 'Water Level' }, value: stats.waterLevel, readingTime: new Date().toISOString() },
    ].filter((entry) => entry.value !== null && entry.value !== undefined);
  },
  history: async (params) => {
    const rows = await request(`/sensors/history/${params.deviceId}`);
    if (!Array.isArray(rows)) return [];

    const filtered = [];
    for (const row of rows) {
      const sensors = [
        { key: 'temp', label: 'Temperature' },
        { key: 'pH', label: 'pH' },
        { key: 'tds', label: 'TDS' },
        { key: 'turbidity', label: 'Turbidity' },
        { key: 'waterLevel', label: 'Water Level' },
      ];

      for (const sensor of sensors) {
        if (row[sensor.key] === null || row[sensor.key] === undefined) continue;

        if (params.sensorId && params.sensorId !== sensor.key && params.sensorId !== sensor.label) {
          continue;
        }

        const readingTime = row.time || new Date().toISOString();
        if (params.from && new Date(readingTime) < new Date(params.from)) continue;
        if (params.to && new Date(readingTime) > new Date(params.to)) continue;

        filtered.push({
          id: `${params.deviceId}-${sensor.key}-${readingTime}`,
          sensorId: sensor.key,
          sensorType: { sensorName: sensor.label },
          value: row[sensor.key],
          readingTime,
        });
      }
    }

    return filtered;
  },
};

// Alerts
export const alertApi = {
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.deviceId) qs.set('device_id', params.deviceId);
    if (params.resolved !== undefined) qs.set('resolved', String(params.resolved));
    return requestSoft(`/alerts?${qs.toString()}`, {}, []);
  },
  resolve: async (alertId) => requestSoft('/alerts/resolve', { method: 'POST', body: JSON.stringify({ alertId }) }, { message: 'No alert backend route configured.' }),
};
