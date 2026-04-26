import { useState, useEffect } from 'react';
import { deviceApi, alertApi } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import '../styles/alerts.css';

export default function Alerts() {
  const [searchParams] = useSearchParams();
  const initialDeviceId = searchParams.get('device_id') || '';

  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  const [filters, setFilters] = useState({
    deviceId: initialDeviceId,
    resolved: 'false', // Default to active alerts
  });

  const loadAlerts = async (f = filters) => {
    setLoading(true);
    try {
      // 1. Load registered devices for filters
      const devs = await deviceApi.list();
      setDevices(devs);

      // 2. Load stored alerts from backend (MQTT alerts)
      const storedAlerts = await alertApi.list({
        tankId: f.deviceId,
        resolved: f.resolved === '' ? undefined : f.resolved
      });

      // 3. Reshape for UI
      const processedAlerts = storedAlerts.map(a => ({
        id: a.id,
        type: a.type.charAt(0).toUpperCase() + a.type.slice(1),
        message: a.message,
        value: a.value,
        deviceId: a.tankId,
        createdAt: a.createdAt,
        resolved: a.resolved,
        tankName: a.tank?.name
      }));

      setAlerts(processedAlerts);
    } catch (err) { 
      console.error("Failed to load alerts:", err);
      setAlerts([]); 
    }
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
      await alertApi.resolve(alertId);
      // Refresh list after resolve
      await loadAlerts();
    } catch (err) {
      alert(err.message || "Failed to resolve alert");
    }
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
                    <td>{a.deviceId} {a.tankName ? `(${a.tankName})` : ''}</td>
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
