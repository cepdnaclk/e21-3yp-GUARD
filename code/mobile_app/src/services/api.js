import AsyncStorage from '@react-native-async-storage/async-storage';
import { SENSOR_FIELDS } from '../constants/sensorConstants';

export let API_ENV = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000'; // Replace with local IP
export let BASE_URL = `${API_ENV}/api`;

export const setCustomApiUrl = async (url) => {
  API_ENV = url;
  BASE_URL = `${API_ENV}/api`;
  await AsyncStorage.setItem('custom_api_url', url);
};

export const loadCustomApiUrl = async () => {
  try {
    const customUrl = await AsyncStorage.getItem('custom_api_url');
    if (customUrl) {
      API_ENV = customUrl;
      BASE_URL = `${API_ENV}/api`;
    }
  } catch (err) {
    console.warn('Failed to load custom API URL', err);
  }
};

// Sends one request to the backend and automatically adds the JWT token.
async function request(endpoint, options = {}) {
  const token = await AsyncStorage.getItem('token');
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
    productKey: tank.productKey || null,
    isRegistered: tank.isRegistered ?? true,
    createdAt: tank.createdAt,
    updatedAt: tank.updatedAt,
    status: tank.status,
    workers: tank.workers || [],
    currentStats: {
      temp: tank.lastTemp,
      pH: tank.lastPh,
      tds: tank.lastTds,
      turbidity: tank.lastTurb,
      waterLevel: tank.lastWaterLevel,
      lastReadingTime: tank.lastReadingTime,
    },
    thresholds: {
      tempMin: tank.tempMin,
      tempMax: tank.tempMax,
      phMin: tank.phMin,
      phMax: tank.phMax,
      tdsMin: tank.tdsMin,
      tdsMax: tank.tdsMax,
      turbidityMax: tank.turbidityMax,
      waterLevelThreshold: tank.waterLevelThreshold,
      waterStopThreshold: tank.waterStopThreshold,
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
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  savePushToken: (token) => request('/auth/push-token', { method: 'POST', body: JSON.stringify({ token }) }),
  createUser: (body) => request('/auth/create-user', { method: 'POST', body: JSON.stringify(body) }),
  getWorkers: () => request('/auth/workers'),
  forgotPasswordInit: (username) => request('/auth/forgot-password/init', { method: 'POST', body: JSON.stringify({ username }) }),
  forgotPasswordVerifyEmail: (username, email) => request('/auth/forgot-password/verify-email', { method: 'POST', body: JSON.stringify({ username, email }) }),
  forgotPasswordVerifyCode: (username, code) => request('/auth/forgot-password/verify-code', { method: 'POST', body: JSON.stringify({ username, code }) }),
  forgotPasswordReset: (username, code, newPassword) => request('/auth/forgot-password/reset', { method: 'POST', body: JSON.stringify({ username, code, newPassword }) }),
};

export const deviceApi = {
  // GET /api/tanks
  list: async () => {
    const tanks = await request('/tanks');
    return Array.isArray(tanks) ? tanks.map(toDeviceFromTank) : [];
  },

  // GET /api/tanks/:tankId/status
  get: async (tankId) => {
    const status = await request(`/tanks/${tankId}/status`);

    return {
      deviceId: status.tankId,
      deviceName: status.name,
      status: status.status,
      workers: status.workers || [],
      currentStats: status.currentStats || {},
      thresholds: status.thresholds || {},
    };
  },

  // POST /api/tanks/register
  register: (body) => request('/tanks/register', { method: 'POST', body: JSON.stringify(body) }),

  // PATCH /api/tanks/:tankId/thresholds
  updateThresholds: (tankId, body) => request(`/tanks/${tankId}/thresholds`, { method: 'PATCH', body: JSON.stringify(body) }),

  // POST /api/tanks/:tankId/assign-user
  assignWorker: (tankId, body) => request(`/tanks/${tankId}/assign-user`, { method: 'POST', body: JSON.stringify(body) }),

  // POST /api/tanks/:tankId/unassign-user
  unassignWorker: (tankId, body) => request(`/tanks/${tankId}/unassign-user`, { method: 'POST', body: JSON.stringify(body) }),

  // POST /api/tanks/:tankId/actuators
  sendCommand: (tankId, command) => request(`/tanks/${tankId}/actuators`, { method: 'POST', body: JSON.stringify({ command }) }),
};

export const alertApi = {
  list: (params = {}) => {
    const qs = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    return request(`/alerts${qs ? '?' + qs : ''}`);
  },
  resolve: (alertId) => request('/alerts/resolve', { method: 'POST', body: JSON.stringify({ alertId }) }),
};

export const sensorApi = {
  // Reads the current tank status and converts it into a simple sensor list.
  latest: async (deviceId) => {
    const status = await request(`/tanks/${deviceId}/status`);
    const { currentStats = {}, updatedAt } = status;
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
        readingTime: currentStats.lastReadingTime || updatedAt || new Date().toISOString(),
      });
    }

    return latestReadings;
  },

  history: async ({ deviceId, sensorId, from, to }) => {
    const query = [];
    if (from) {
      const parsedFrom = new Date(from);
      if (!Number.isNaN(parsedFrom.getTime())) query.push(`from=${parsedFrom.toISOString()}`);
    }
    if (to) {
      const parsedTo = new Date(to);
      if (!Number.isNaN(parsedTo.getTime())) query.push(`to=${parsedTo.toISOString()}`);
    }
    const queryStr = query.length > 0 ? `?${query.join('&')}` : '';
    const rows = await request(`/sensors/history/${encodeURIComponent(deviceId)}${queryStr}`);
    
    if (!Array.isArray(rows)) return [];

    const historyReadings = [];
    for (const row of rows) {
      const readings = toReadingRows(row, deviceId);
      for (const reading of readings) {
        if (sensorId && reading.sensorId !== sensorId && reading.sensorType.sensorName !== sensorId) {
          continue;
        }
        historyReadings.push(reading);
      }
    }
    return historyReadings;
  },
};

export const fishApi = {
  list: () => request('/fish'),
  get: (id) => request(`/fish/${id}`),
};
