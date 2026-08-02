import axios from 'axios';
import { SENSOR_FIELDS } from '../constants/sensorConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Axios client
//
// Base URL strategy:
//   • No VITE_API_URL set  →  baseURL = '/api'
//     Vite dev-server proxies /api → http://localhost:5000 (or configured target)
//     Nginx in production proxies /api → backend
//
//   • VITE_API_URL = 'https://example.com'  →  baseURL = 'https://example.com/api'
//     The env var must NOT already include /api to avoid /api/api.
//
// Never hardcode localhost:5000 or any IP here.
// ─────────────────────────────────────────────────────────────────────────────
const _envOrigin = import.meta.env.VITE_API_URL; // e.g. 'https://example.com' or undefined

export const apiClient = axios.create({
  baseURL: _envOrigin ? `${_envOrigin}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token automatically.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — unwrap data; normalise errors.
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    const message =
      data?.error ||
      data?.errors?.[0]?.msg ||
      `Request failed (${error.response?.status ?? 'network error'})`;
    return Promise.reject(new Error(message));
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Helper: multipart/form-data upload (JWT auto-attached via interceptor).
// ─────────────────────────────────────────────────────────────────────────────
function postForm(endpoint, method, formData) {
  return apiClient.request({
    method,
    url: endpoint,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shape converters
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Auth API  →  /api/auth/...
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  // Public auth routes.
  register: (body) => apiClient.post('/auth/register', body),
  login: (body) => apiClient.post('/auth/login', body),
  googleLogin: (idToken) => apiClient.post('/auth/google', { idToken }),
  verifyEmail: (username, code) => apiClient.post('/auth/verify-email', { username, code }),
  resendVerification: (username, email) => apiClient.post('/auth/resend-verification', { username, email }),
  getMe: () => apiClient.get('/auth/me'),
  updateProfile: (body) => apiClient.put('/auth/me', body),
  sendEmailOtp: (email) => apiClient.post('/auth/profile/verify-email/send', { email }),
  confirmEmailOtp: (code) => apiClient.post('/auth/profile/verify-email/confirm', { code }),
  sendPhoneOtp: (phoneNumber) => apiClient.post('/auth/profile/verify-phone/send', { phoneNumber }),
  confirmPhoneOtp: () => apiClient.post('/auth/profile/verify-phone/confirm'),
  uploadProfilePicture: (imageFile) => {
    const fd = new FormData();
    fd.append('profilePicture', imageFile);
    return postForm('/auth/profile/picture', 'POST', fd);
  },
  deleteProfilePicture: () => apiClient.delete('/auth/profile/picture'),

  // Forgot Password APIs
  forgotPasswordInit: (username) =>
    apiClient.post('/auth/forgot-password/init', { username }),
  forgotPasswordVerifyEmail: (username, email) =>
    apiClient.post('/auth/forgot-password/verify-email', { username, email }),
  forgotPasswordVerifyCode: (username, code) =>
    apiClient.post('/auth/forgot-password/verify-code', { username, code }),
  forgotPasswordReset: (username, code, newPassword) =>
    apiClient.post('/auth/forgot-password/reset', { username, code, newPassword }),

  // Admin-only routes.
  createAdmin: (body) => apiClient.post('/auth/create-admin', body),
  createUser: (body) => apiClient.post('/auth/create-user', body),
  listWorkers: () => apiClient.get('/auth/workers'),
  getUsersByAdmin: () => apiClient.get('/auth/users'),
  deleteUserByAdmin: (userId) => apiClient.delete(`/auth/users/${userId}`),

  // SUPER_ADMIN-only routes.
  getAdminsBySuperAdmin: () => apiClient.get('/auth/admins'),
  deleteAdminBySuperAdmin: (adminId) => apiClient.delete(`/auth/admins/${adminId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Alert API  →  /api/alerts/...
// ─────────────────────────────────────────────────────────────────────────────
export const alertApi = {
  list: (params = {}) => apiClient.get('/alerts', { params }),
  resolve: (alertId) => apiClient.post('/alerts/resolve', { alertId }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Device / Tank API  →  /api/tanks/...
// ─────────────────────────────────────────────────────────────────────────────
export const deviceApi = {
  // GET /api/tanks
  list: async () => {
    const tanks = await apiClient.get('/tanks');
    return Array.isArray(tanks) ? tanks.map(toDeviceFromTank) : [];
  },

  // POST /api/tanks/register
  create: async ({ productKey, deviceName }) => {
    const created = await apiClient.post('/tanks/register', {
      productKey: String(productKey),
      name: deviceName || `Device ${productKey}`,
    });
    return created?.tank ? toDeviceFromTank(created.tank) : created;
  },

  // POST /api/tanks/:tankId/assign-user
  assignUser: (tankId, userId) =>
    apiClient.post(`/tanks/${tankId}/assign-user`, { userId }),

  // POST /api/tanks/:tankId/unassign-user
  unassignUser: (tankId, userId) =>
    apiClient.post(`/tanks/${tankId}/unassign-user`, { userId }),

  // POST /api/tanks/add-product (SUPER_ADMIN only)
  addProduct: (tankId, productKey) =>
    apiClient.post('/tanks/add-product', { tankId, productKey }),

  // DELETE /api/tanks/:tankId
  deleteTank: (tankId, name) =>
    apiClient.delete(`/tanks/${tankId}`, { data: { name } }),

  // POST /api/tanks/:tankId/actuators
  actuate: (tankId, command) =>
    apiClient.post(`/tanks/${tankId}/actuators`, { command }),

  // GET /api/tanks/:tankId/status
  get: async (tankId) => {
    const status = await apiClient.get(`/tanks/${tankId}/status`);
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
  updateThresholds: (tankId, thresholds) =>
    apiClient.patch(`/tanks/${tankId}/thresholds`, thresholds),
};

// ─────────────────────────────────────────────────────────────────────────────
// Sensor utilities
// ─────────────────────────────────────────────────────────────────────────────
export function extractReadingsFromDevice(device) {
  if (!device) return [];
  const deviceId = device.deviceId || device.tankId;
  const currentStats = device.currentStats || {};
  const updatedAt = device.updatedAt;
  const latestReadings = [];

  for (const [key, sensorName] of SENSOR_FIELDS) {
    let value = currentStats[key];

    if (value === null || value === undefined) {
      if (key === 'pH') value = currentStats.ph ?? device.lastPh ?? device.lastPH;
      else if (key === 'temp') value = currentStats.temperature ?? device.lastTemp;
      else if (key === 'tds') value = device.lastTds;
      else if (key === 'turbidity') value = device.lastTurb;
      else if (key === 'waterLevel') value = currentStats.waterlevel ?? device.lastWaterLevel;
    }

    if (value === null || value === undefined) {
      continue;
    }

    latestReadings.push({
      id: `${deviceId}-${key}`,
      sensorId: key,
      sensorType: { sensorName },
      value,
      readingTime: currentStats.lastReadingTime || device.lastReadingTime || updatedAt || new Date().toISOString(),
    });
  }

  return latestReadings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sensor API  →  /api/sensors/...
// ─────────────────────────────────────────────────────────────────────────────
export const sensorApi = {
  // Public sensor log route used by the hardware or test clients.
  log: (body) => apiClient.post('/sensors/log', body),

  // Reads the current tank status and converts it into a simple sensor list.
  latest: async (deviceId) => {
    const status = await apiClient.get(`/tanks/${deviceId}/status`);
    return extractReadingsFromDevice(status);
  },

  // Fetches Influx history and reshapes it for charts and tables.
  history: async ({ deviceId, sensorId, from, to }) => {
    const params = {};

    if (from) {
      const parsedFrom = new Date(from);
      if (!Number.isNaN(parsedFrom.getTime())) {
        params.from = parsedFrom.toISOString();
      }
    }

    if (to) {
      const parsedTo = new Date(to);
      if (!Number.isNaN(parsedTo.getTime())) {
        params.to = parsedTo.toISOString();
      }
    }

    const rows = await apiClient.get(
      `/sensors/history/${encodeURIComponent(deviceId)}`,
      { params }
    );
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
    const rows = await apiClient.get(`/sensors/history/${encodeURIComponent(deviceId)}`);
    return Array.isArray(rows) ? rows : [];
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fish Species Catalogue
// ─────────────────────────────────────────────────────────────────────────────
import carpImg from '../assets/fish/carp.png';
import catfishImg from '../assets/fish/catfish.png';
import dwarfGouramiImg from '../assets/fish/dwarf-gourami.png';
import giantGouramiImg from '../assets/fish/giant-gourami.png';
import arowanaImg from '../assets/fish/arowana.png';
import tigerBarbImg from '../assets/fish/tiger-barb.png';
import rainbowSharkImg from '../assets/fish/rainbow-shark.png';
import oscarImg from '../assets/fish/oscar.png';
import tilapiaImg from '../assets/fish/tilapia.png';
import koiImg from '../assets/fish/koi.png';
import guppyImg from '../assets/fish/guppy.png';
import bettaImg from '../assets/fish/betta.png';
import mollyImg from '../assets/fish/molly.png';

const BUNDLED_FISH_IMAGES = {
  '/uploads/fish/carp.png': carpImg,
  '/uploads/fish/catfish.png': catfishImg,
  '/uploads/fish/dwarf-gourami.png': dwarfGouramiImg,
  '/uploads/fish/giant-gourami.png': giantGouramiImg,
  '/uploads/fish/arowana.png': arowanaImg,
  '/uploads/fish/tiger-barb.png': tigerBarbImg,
  '/uploads/fish/rainbow-shark.png': rainbowSharkImg,
  '/uploads/fish/oscar.png': oscarImg,
  '/uploads/fish/tilapia.png': tilapiaImg,
  '/uploads/fish/koi.png': koiImg,
  '/uploads/fish/guppy.png': guppyImg,
  '/uploads/fish/betta.png': bettaImg,
  '/uploads/fish/molly.png': mollyImg,
};

// Images are stored locally on the backend and served at /uploads/fish/
// Nginx and Vite dev-server both proxy /uploads to the backend.
// Use getImageUrl() to build the correct src for any imageUrl from the DB.
//
// IMPORTANT: /uploads is NOT under /api — do NOT prefix it with the API base URL.
const _backendOrigin = import.meta.env.VITE_API_URL || '';

export function getImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (BUNDLED_FISH_IMAGES[imageUrl]) return BUNDLED_FISH_IMAGES[imageUrl];
  if (imageUrl.startsWith('http')) return imageUrl;          // already absolute
  // e.g. /uploads/fish/fish-xxx.jpg  →  keep as relative in production
  return `${_backendOrigin}${imageUrl}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fish API  →  /api/fish/...
// ─────────────────────────────────────────────────────────────────────────────
export const fishApi = {
  // GET /api/fish?search=<query>
  list: (search = '') => {
    const params = search ? { search } : {};
    return apiClient.get('/fish', { params });
  },

  // GET /api/fish/:id
  get: (id) => apiClient.get(`/fish/${id}`),

  // POST /api/fish  (SUPER_ADMIN only) — send as FormData to support image upload
  create: (fields, imageFile) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== '') fd.append(k, v); });
    if (imageFile) fd.append('image', imageFile);
    return postForm('/fish', 'POST', fd);
  },

  // PUT /api/fish/:id  (SUPER_ADMIN only)
  update: (id, fields, imageFile, removeImage = false) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== '') fd.append(k, v); });
    if (imageFile) fd.append('image', imageFile);
    if (removeImage) fd.append('removeImage', 'true');
    return postForm(`/fish/${id}`, 'PUT', fd);
  },

  // DELETE /api/fish/:id  (SUPER_ADMIN only)
  delete: (id) => apiClient.delete(`/fish/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Device Request API  →  /api/device-requests/...
// ─────────────────────────────────────────────────────────────────────────────
export const deviceRequestApi = {
  create: (body) => apiClient.post('/device-requests', body),
  list: () => apiClient.get('/device-requests'),
  delete: (id) => apiClient.delete(`/device-requests/${id}`),
};
