import axios from 'axios';
import { SENSOR_FIELDS } from '../constants/sensorConstants';

const API_ENV = import.meta.env.VITE_API_URL || '';
const BASE_URL = API_ENV ? `${API_ENV}/api` : '/api';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    const message = data?.error || data?.errors?.[0]?.msg || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

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
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  googleLogin: (idToken) => api.post('/auth/google', { idToken }),
  verifyEmail: (username, code) => api.post('/auth/verify-email', { username, code }),
  resendVerification: (username, email) => api.post('/auth/resend-verification', { username, email }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (body) => api.put('/auth/me', body),
  sendEmailOtp: (email) => api.post('/auth/profile/verify-email/send', { email }),
  confirmEmailOtp: (code) => api.post('/auth/profile/verify-email/confirm', { code }),
  sendPhoneOtp: (phoneNumber) => api.post('/auth/profile/verify-phone/send', { phoneNumber }),
  confirmPhoneOtp: () => api.post('/auth/profile/verify-phone/confirm'),
  uploadProfilePicture: (imageFile) => {
    const fd = new FormData();
    fd.append('profilePicture', imageFile);
    return api.post('/auth/profile/picture', fd);
  },
  deleteProfilePicture: () => api.delete('/auth/profile/picture'),

  // Forgot Password APIs
  forgotPasswordInit: async (username) => {
    return api.post('/auth/forgot-password/init', { username });
  },
  forgotPasswordVerifyEmail: async (username, email) => {
    return api.post('/auth/forgot-password/verify-email', { username, email });
  },
  forgotPasswordVerifyCode: async (username, code) => {
    return api.post('/auth/forgot-password/verify-code', { username, code });
  },
  forgotPasswordReset: async (username, code, newPassword) => {
    return api.post('/auth/forgot-password/reset', { username, code, newPassword });
  },

  // Admin-only routes.
  createAdmin: (body) => api.post('/auth/create-admin', body),
  createUser: (body) => api.post('/auth/create-user', body),
  listWorkers: () => api.get('/auth/workers'),
  getUsersByAdmin: () => api.get('/auth/users'),
  deleteUserByAdmin: (userId) => api.delete(`/auth/users/${userId}`),

  // SUPER_ADMIN-only routes.
  getAdminsBySuperAdmin: () => api.get('/auth/admins'),
  deleteAdminBySuperAdmin: (adminId) => api.delete(`/auth/admins/${adminId}`),
};

export const alertApi = {
  list: (params = {}) => api.get('/alerts', { params }),
  resolve: (alertId) => api.post('/alerts/resolve', { alertId }),
};

export const deviceApi = {
  // GET /api/tanks
  list: async () => {
    const tanks = await api.get('/tanks');
    return Array.isArray(tanks) ? tanks.map(toDeviceFromTank) : [];
  },

  // POST /api/tanks/register
  create: async ({ productKey, deviceName }) => {
    const created = await api.post('/tanks/register', {
      productKey: String(productKey),
      name: deviceName || `Device ${productKey}`,
    });
    return created?.tank ? toDeviceFromTank(created.tank) : created;
  },

  // POST /api/tanks/:tankId/assign-user
  assignUser: (tankId, userId) => api.post(`/tanks/${tankId}/assign-user`, { userId }),

  // POST /api/tanks/:tankId/unassign-user
  unassignUser: (tankId, userId) => api.post(`/tanks/${tankId}/unassign-user`, { userId }),

  // POST /api/tanks/add-product (SUPER_ADMIN only)
  addProduct: async (tankId, productKey) => {
    return api.post('/tanks/add-product', { tankId, productKey });
  },

  // DELETE /api/tanks/:tankId
  deleteTank: (tankId, name) => api.delete(`/tanks/${tankId}`, { data: { name } }),

  // POST /api/tanks/:tankId/actuators
  actuate: (tankId, command) => api.post(`/tanks/${tankId}/actuators`, { command }),

  // GET /api/tanks/:tankId/status
  get: async (tankId) => {
    const status = await api.get(`/tanks/${tankId}/status`);
    return {
      deviceId: status.tankId,
      deviceName: status.name,
      status: status.status,
      workers: status.workers || [],
      currentStats: status.currentStats || {},
      thresholds: status.thresholds || {},
    };
  },

  // PATCH /api/tanks/:tankId/thresholds
  updateThresholds: (tankId, thresholds) => api.patch(`/tanks/${tankId}/thresholds`, thresholds),
};

export const sensorApi = {
  // Public sensor log route used by the hardware or test clients.
  log: (body) => api.post('/sensors/log', body),

  // Reads the current tank status and converts it into a simple sensor list.
  latest: async (deviceId) => {
    const status = await api.get(`/tanks/${deviceId}/status`);
    const { currentStats = {}, updatedAt } = status;
    const latestReadings = [];

    for (const [key, sensorName] of SENSOR_FIELDS) {
      const value = currentStats[key === 'temp' ? 'temp' : key];
      if (value === null || value === undefined) continue;
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

  // Fetches Influx history and reshapes it for charts and tables.
  history: async ({ deviceId, sensorId, from, to }) => {
    const params = {};
    if (from) {
      const parsedFrom = new Date(from);
      if (!Number.isNaN(parsedFrom.getTime())) params.from = parsedFrom.toISOString();
    }
    if (to) {
      const parsedTo = new Date(to);
      if (!Number.isNaN(parsedTo.getTime())) params.to = parsedTo.toISOString();
    }

    const rows = await api.get(`/sensors/history/${encodeURIComponent(deviceId)}`, { params });
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

  // Raw chart data for TankTimeSeriesChart (returns rows as-is from InfluxDB).
  chartHistory: async (deviceId) => {
    const rows = await api.get(`/sensors/history/${encodeURIComponent(deviceId)}`);
    return Array.isArray(rows) ? rows : [];
  },
};

// ── Fish Species Catalogue ──────────────────────────────────────
// Images are stored locally on the backend and served at /uploads/fish/
// Use getImageUrl() to build the correct src for any imageUrl from the DB.
export function getImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;          // already absolute
  return `${API_ENV}${imageUrl}`;                            // e.g. /uploads/fish/fish-xxx.jpg
}

export const fishApi = {
  // GET /api/fish?search=<query>
  list: (search = '') => {
    const params = search ? { search } : {};
    return api.get('/fish', { params });
  },

  // GET /api/fish/:id
  get: (id) => api.get(`/fish/${id}`),

  // POST /api/fish  (SUPER_ADMIN only) — send as FormData to support image upload
  create: (fields, imageFile) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== '') fd.append(k, v); });
    if (imageFile) fd.append('image', imageFile);
    return api.post('/fish', fd);
  },

  // PUT /api/fish/:id  (SUPER_ADMIN only)
  update: (id, fields, imageFile, removeImage = false) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== '') fd.append(k, v); });
    if (imageFile) fd.append('image', imageFile);
    if (removeImage) fd.append('removeImage', 'true');
    return api.put(`/fish/${id}`, fd);
  },

  // DELETE /api/fish/:id  (SUPER_ADMIN only)
  delete: (id) => api.delete(`/fish/${id}`),
};

export const deviceRequestApi = {
  create: (body) => api.post('/device-requests', body),
  list: () => api.get('/device-requests'),
  delete: (id) => api.delete(`/device-requests/${id}`),
};
