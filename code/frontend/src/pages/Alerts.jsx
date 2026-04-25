import { useState, useEffect } from 'react';
import { deviceApi, sensorApi } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import '../styles/alerts.css';

function buildAlerts(devices, sensorData) {
  const alerts = [];

  for (const device of devices) {
    const readings = sensorData[device.deviceId] || [];
    const hasReadings = readings.length > 0;

    if (!hasReadings || device.status !== 'online') {
      alerts.push({
        id: `${device.deviceId}-offline`,
        type: 'Status',
        message: `${device.deviceName || `Tank ${device.deviceId}`} appears offline`,
        value: device.status || 'unknown',
        deviceId: device.deviceId,
        createdAt: device.updatedAt || new Date().toISOString(),
        resolved: false,
      });
    }
  }

  return alerts;
}

export default function Alerts() {
  const [searchParams] = useSearchParams();
  const initialDeviceId = searchParams.get('device_id') || '';

  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  const [filters, setFilters] = useState({
    deviceId: initialDeviceId,
    resolved: 'false',
  });

  const loadAlerts = async (f = filters) => {
    setLoading(true);
    try {
      const devs = await deviceApi.list();

      const readingEntries = await Promise.all(
        devs.map(async (device) => {
          try {
            const latest = await sensorApi.latest(device.deviceId);
            return [device.deviceId, Array.isArray(latest) ? latest : []];
          } catch {
            return [device.deviceId, []];
          }
        })
      );

      const sensorData = Object.fromEntries(readingEntries);
      const generatedAlerts = buildAlerts(devs, sensorData);

      setDevices(devs);
      setAllAlerts(generatedAlerts);

      const filteredAlerts = generatedAlerts.filter((alert) => {
        if (f.deviceId && alert.deviceId !== f.deviceId) return false;
        if (f.resolved === 'true' && !alert.resolved) return false;
        if (f.resolved === 'false' && alert.resolved) return false;
        return true;
      });

      setAlerts(filteredAlerts);
    } catch { setAlerts([]); }
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (field) => (e) => {
    const newFilters = { ...filters, [field]: e.target.value };
    setFilters(newFilters);
    loadAlerts(newFilters);
  };

  const handleResolve = async (alertId) => {
    setResolving(alertId);
    try {
      const updated = allAlerts.map((alert) => (
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
      setAllAlerts(updated);

      const filtered = updated.filter((alert) => {
        if (filters.deviceId && alert.deviceId !== filters.deviceId) return false;
        if (filters.resolved === 'true' && !alert.resolved) return false;
        if (filters.resolved === 'false' && alert.resolved) return false;
        return true;
      });

      setAlerts(filtered);
    } catch { /* ignore */ }
    setResolving(null);
  };

  return (
    <div className="alerts-page">
      <h3 className="alerts-title">Notifications</h3>

      <div className="card alerts-filter-card">
        <div className="filters">
          <div className="form-group">
            <label>Device</label>
            <select value={filters.deviceId} onChange={handleFilterChange('deviceId')}>
              <option value="">All devices</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId} — {d.deviceName || 'Unnamed'}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={filters.resolved} onChange={handleFilterChange('resolved')}>
              <option value="">All</option>
              <option value="false">Active</option>
              <option value="true">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card alerts-table-card">
        {loading ? (
          <div className="empty-state"><p>Loading alerts...</p></div>
        ) : alerts.length === 0 ? (
          <div className="empty-state"><p>No alerts match filters.</p></div>
        ) : (
          <div className="table-wrap alerts-table-wrap">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Value</th>
                  <th>Device</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className={`alert-type-chip ${a.resolved ? 'resolved' : 'unresolved'}`}>
                        {a.type}
                      </span>
                    </td>
                    <td>{a.message}</td>
                    <td>{a.value}</td>
                    <td>{a.deviceId}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                    <td>
                      {a.resolved
                        ? <span className="alert-status-chip resolved">Resolved</span>
                        : <span className="alert-status-chip active">Active</span>}
                    </td>
                    <td>
                      {!a.resolved && (
                        <button
                          className="alerts-resolve-btn"
                          onClick={() => handleResolve(a.id)}
                          disabled={resolving === a.id}
                        >
                          {resolving === a.id ? '...' : 'Resolve'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
