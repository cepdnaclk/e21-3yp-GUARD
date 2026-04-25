const BASE_URL = 'http://localhost:5000/api';

// Sensor keys used by the backend and the UI.
const SENSOR_FIELDS = [
  ['temp', 'Temperature'],
  ['pH', 'pH'],
  ['tds', 'TDS'],
  ['turbidity', 'Turbidity'],
  ['waterLevel', 'Water Level'],
];

// Sends one request to the backend and automatically adds the JWT token.
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.errors?.[0]?.msg || `Request failed (${response.status})`);
  }

  return data;
}

// Converts a tank record from the backend into the frontend device shape.
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

// Turns one history row into a list of readings for the chart UI.
function toReadingRows(row, deviceId) {
  const readingTime = row.time || new Date().toISOString();
  const readings = [];

  for (const [key, sensorName] of SENSOR_FIELDS) {
    const value = row[key];

    if (value === null || value === undefined) {
      continue;
    }

    readings.push({
      id: `${deviceId}-${key}-${readingTime}`,
      sensorId: key,
      sensorType: { sensorName },
      value,
      readingTime,
    });
  }

  return readings;
}

export const authApi = {
  // Public auth routes.
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  googleLogin: (idToken) => request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  verifyEmail: (token) => request(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerification: (email) => request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'POST', body: JSON.stringify(body) }),

  // Admin-only routes.
  createAdmin: (body) => request('/auth/create-admin', { method: 'POST', body: JSON.stringify(body) }),
  createUser: (body) => request('/auth/create-user', { method: 'POST', body: JSON.stringify(body) }),
};

export const deviceApi = {
  // GET /api/tanks
  list: async () => {
    const tanks = await request('/tanks');
    return Array.isArray(tanks) ? tanks.map(toDeviceFromTank) : [];
  },

  // POST /api/tanks/register
  create: async ({ deviceId, deviceName }) => {
    const created = await request('/tanks/register', {
      method: 'POST',
      body: JSON.stringify({
        tankId: String(deviceId),
        name: deviceName || `Tank ${deviceId}`,
      }),
    });

    return created?.tank ? toDeviceFromTank(created.tank) : created;
  },

  // POST /api/tanks/:tankId/assign-user
  assignUser: (tankId, userId) => request(`/tanks/${tankId}/assign-user`, { method: 'POST', body: JSON.stringify({ userId }) }),

  // GET /api/tanks/:tankId/status
  get: async (tankId) => {
    const status = await request(`/tanks/${tankId}/status`);

    return {
      deviceId: status.tankId,
      deviceName: status.name,
      status: status.status,
      currentStats: status.currentStats || {},
    };
  },
};

export const sensorApi = {
  // Public sensor log route used by the hardware or test clients.
  log: (body) => request('/sensors/log', { method: 'POST', body: JSON.stringify(body) }),

  // Reads the current tank status and converts it into a simple sensor list.
  latest: async (deviceId) => {
    const { currentStats = {} } = await request(`/tanks/${deviceId}/status`);
    const latestReadings = [];

    for (const [key, sensorName] of SENSOR_FIELDS) {
      const value = currentStats[key === 'temp' ? 'temp' : key];

      if (value === null || value === undefined) {
        continue;
      }

      latestReadings.push({
        id: `${deviceId}-${key}`,
        sensorId: key,
        sensorType: { sensorName },
        value,
        readingTime: new Date().toISOString(),
      });
    }

    return latestReadings;
  },

  // Fetches Influx history and reshapes it for charts and tables.
  history: async ({ deviceId, sensorId, from, to }) => {
    const rows = await request(`/sensors/history/${deviceId}`);
    if (!Array.isArray(rows)) return [];

    const historyReadings = [];

    for (const row of rows) {
      const readings = toReadingRows(row, deviceId);

      for (const reading of readings) {
        if (sensorId && reading.sensorId !== sensorId && reading.sensorType.sensorName !== sensorId) {
          continue;
        }

        if (from && new Date(reading.readingTime) < new Date(from)) {
          continue;
        }

        if (to && new Date(reading.readingTime) > new Date(to)) {
          continue;
        }

        historyReadings.push(reading);
      }
    }

    return historyReadings;
  },
};
