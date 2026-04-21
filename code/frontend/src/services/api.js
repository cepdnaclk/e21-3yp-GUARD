const BASE_URL = '/api';

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
  list: () => request('/devices'),
  create: (body) => request('/devices', { method: 'POST', body: JSON.stringify(body) }),
  get: (id) => request(`/devices/${id}`),
};

// Sensor Types
export const sensorTypeApi = {
  list: () => request('/sensor-types'),
  create: (body) => request('/sensor-types', { method: 'POST', body: JSON.stringify(body) }),
  get: (id) => request(`/sensor-types/${id}`),
};

// Sensor Readings
export const sensorApi = {
  latest: (deviceId) => request(`/sensor/latest?device_id=${deviceId}`),
  history: (params) => {
    const qs = new URLSearchParams();
    qs.set('device_id', params.deviceId);
    if (params.sensorId) qs.set('sensor_id', params.sensorId);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    return request(`/sensor/history?${qs.toString()}`);
  },
};

// Alerts
export const alertApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.deviceId) qs.set('device_id', params.deviceId);
    if (params.resolved !== undefined) qs.set('resolved', String(params.resolved));
    return request(`/alerts?${qs.toString()}`);
  },
  resolve: (alertId) => request('/alerts/resolve', { method: 'POST', body: JSON.stringify({ alertId }) }),
};
