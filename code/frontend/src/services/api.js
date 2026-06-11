import { SENSOR_FIELDS } from '../constants/sensorConstants';

const API_ENV = import.meta.env.VITE_API_URL;
const BASE_URL = API_ENV ? `${API_ENV}/api` : '/api';

// Sends one request to the backend.
// The JWT is now stored in an HttpOnly cookie and sent automatically by the browser.
// 'credentials: include' is required so the browser attaches cross-origin cookies.
async function request(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',   // Send the HttpOnly auth cookie on every request
  });
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
  verifyEmail: (username, code) => request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ username, code }) }),
  resendVerification: (username, email) => request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ username, email }) }),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
  sendEmailOtp: (email) => request('/auth/profile/verify-email/send', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmEmailOtp: (code) => request('/auth/profile/verify-email/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
  sendPhoneOtp: (phoneNumber) => request('/auth/profile/verify-phone/send', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),
  confirmPhoneOtp: () => request('/auth/profile/verify-phone/confirm', { method: 'POST' }),
  uploadProfilePicture: (imageFile) => {
    const fd = new FormData();
    fd.append('profilePicture', imageFile);
    return requestForm('/auth/profile/picture', 'POST', fd);
  },
  deleteProfilePicture: () => request('/auth/profile/picture', { method: 'DELETE' }),

  // Forgot Password APIs
  forgotPasswordInit: async (username) => {
    return request('/auth/forgot-password/init', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  forgotPasswordVerifyEmail: async (username, email) => {
    return request('/auth/forgot-password/verify-email', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
    });
  },

  forgotPasswordVerifyCode: async (username, code) => {
    return request('/auth/forgot-password/verify-code', {
      method: 'POST',
      body: JSON.stringify({ username, code }),
    });
  },

  forgotPasswordReset: async (username, code, newPassword) => {
    return request('/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify({ username, code, newPassword }),
    });
  },

  // Admin-only routes.
  createAdmin: (body) => request('/auth/create-admin', { method: 'POST', body: JSON.stringify(body) }),
  createUser: (body) => request('/auth/create-user', { method: 'POST', body: JSON.stringify(body) }),
  listWorkers: () => request('/auth/workers'),
  getUsersByAdmin: () => request('/auth/users'),
  deleteUserByAdmin: (userId) => request(`/auth/users/${userId}`, { method: 'DELETE' }),

  // Logout — clears the server-side HttpOnly cookie
  logout: () => request('/auth/logout', { method: 'POST' }),

  // SUPER_ADMIN-only routes.
  getAdminsBySuperAdmin: () => request('/auth/admins'),
  deleteAdminBySuperAdmin: (adminId) => request(`/auth/admins/${adminId}`, { method: 'DELETE' }),
};

export const alertApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/alerts?${qs}`);
  },
  resolve: (alertId) => request('/alerts/resolve', { method: 'POST', body: JSON.stringify({ alertId }) }),
};

export const deviceApi = {
  // GET /api/tanks
  list: async () => {
    const tanks = await request('/tanks');
    return Array.isArray(tanks) ? tanks.map(toDeviceFromTank) : [];
  },

  // POST /api/tanks/register
  create: async ({ productKey, deviceName }) => {
    const created = await request('/tanks/register', {
      method: 'POST',
      body: JSON.stringify({
        productKey: String(productKey),
        name: deviceName || `Device ${productKey}`,
      }),
    });

    return created?.tank ? toDeviceFromTank(created.tank) : created;
  },

  // POST /api/tanks/:tankId/assign-user
  assignUser: (tankId, userId) => request(`/tanks/${tankId}/assign-user`, { method: 'POST', body: JSON.stringify({ userId }) }),

  // POST /api/tanks/:tankId/unassign-user
  unassignUser: (tankId, userId) => request(`/tanks/${tankId}/unassign-user`, { method: 'POST', body: JSON.stringify({ userId }) }),

  // POST /api/tanks/add-product (SUPER_ADMIN only)
  addProduct: async (tankId, productKey) => {
    return request('/tanks/add-product', {
      method: 'POST',
      body: JSON.stringify({ tankId, productKey }),
    });
  },

  // DELETE /api/tanks/:tankId
  deleteTank: (tankId, name) => request(`/tanks/${tankId}`, {
    method: 'DELETE',
    body: JSON.stringify({ name }),
  }),

  // POST /api/tanks/:tankId/actuators
  actuate: (tankId, command) => request(`/tanks/${tankId}/actuators`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  }),

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

  // PATCH /api/tanks/:tankId/thresholds
  updateThresholds: (tankId, thresholds) => request(`/tanks/${tankId}/thresholds`, {
    method: 'PATCH',
    body: JSON.stringify(thresholds),
  }),
};

export const sensorApi = {
  // Public sensor log route used by the hardware or test clients.
  log: (body) => request('/sensors/log', { method: 'POST', body: JSON.stringify(body) }),

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

  // Fetches Influx history and reshapes it for charts and tables.
  history: async ({ deviceId, sensorId, from, to }) => {
    const query = new URLSearchParams();

    if (from) {
      const parsedFrom = new Date(from);
      if (!Number.isNaN(parsedFrom.getTime())) {
        query.set('from', parsedFrom.toISOString());
      }
    }

    if (to) {
      const parsedTo = new Date(to);
      if (!Number.isNaN(parsedTo.getTime())) {
        query.set('to', parsedTo.toISOString());
      }
    }

    const querySuffix = query.toString() ? `?${query.toString()}` : '';
    const rows = await request(`/sensors/history/${encodeURIComponent(deviceId)}${querySuffix}`);
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
    const rows = await request(`/sensors/history/${encodeURIComponent(deviceId)}`);
    return Array.isArray(rows) ? rows : [];
  },
};

// ── Fish Species Catalogue ──────────────────────────────────────
// Images are stored locally on the backend and served at /uploads/fish/
// Use getImageUrl() to build the correct src for any imageUrl from the DB.
const BACKEND_ORIGIN = import.meta.env.VITE_API_URL || '';

export function getImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;          // already absolute
  return `${BACKEND_ORIGIN}${imageUrl}`;                     // e.g. /uploads/fish/fish-xxx.jpg
}

/** Send a multipart/form-data request (for file uploads). Cookie auto-attached. */
async function requestForm(endpoint, method, formData) {
  // Do NOT set Content-Type — browser sets it with boundary automatically for FormData
  // Do NOT set Authorization header — the HttpOnly cookie is sent automatically via credentials
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    body: formData,
    credentials: 'include',   // Attach the HttpOnly auth cookie
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || data?.errors?.[0]?.msg || `Request failed (${response.status})`);
  }
  return data;
}

export const fishApi = {
  // GET /api/fish?search=<query>
  list: (search = '') => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/fish${qs}`);
  },

  // GET /api/fish/:id
  get: (id) => request(`/fish/${id}`),

  // POST /api/fish  (SUPER_ADMIN only) — send as FormData to support image upload
  create: (fields, imageFile) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== '') fd.append(k, v); });
    if (imageFile) fd.append('image', imageFile);
    return requestForm('/fish', 'POST', fd);
  },

  // PUT /api/fish/:id  (SUPER_ADMIN only)
  update: (id, fields, imageFile, removeImage = false) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== '') fd.append(k, v); });
    if (imageFile) fd.append('image', imageFile);
    if (removeImage) fd.append('removeImage', 'true');
    return requestForm(`/fish/${id}`, 'PUT', fd);
  },

  // DELETE /api/fish/:id  (SUPER_ADMIN only)
  delete: (id) => request(`/fish/${id}`, { method: 'DELETE' }),
};

