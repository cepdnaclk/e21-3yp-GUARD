import { useState, useEffect } from 'react';
import { deviceApi, alertApi } from '../services/api';
import { useSearchParams } from 'react-router-dom';

export default function Alerts() {
  const [searchParams] = useSearchParams();
  const initialDeviceId = searchParams.get('device_id') || '';

  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  const [filters, setFilters] = useState({
    deviceId: initialDeviceId,
    resolved: 'false',
  });

  const loadAlerts = async (f = filters) => {
    setLoading(true);
    try {
      const params = {};
      if (f.deviceId) params.deviceId = f.deviceId;
      if (f.resolved !== '') params.resolved = f.resolved === 'true';
      setAlerts(await alertApi.list(params));
    } catch { setAlerts([]); }
    setLoading(false);
  };

  useEffect(() => {
    deviceApi.list().then(setDevices).catch(() => {});
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
      await loadAlerts();
    } catch { /* ignore */ }
    setResolving(null);
  };

  return (
    <>
      <h3 style={{ marginBottom: '1rem' }}>Alerts</h3>

      <div className="card" style={{ marginBottom: '1rem' }}>
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

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading alerts...</p></div>
        ) : alerts.length === 0 ? (
          <div className="empty-state"><p>No alerts match filters.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
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
                    <td><span className={`badge ${a.resolved ? 'badge-success' : 'badge-danger'}`}>{a.type}</span></td>
                    <td>{a.message}</td>
                    <td>{a.value}</td>
                    <td>{a.deviceId}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                    <td>
                      {a.resolved
                        ? <span className="badge badge-success">Resolved</span>
                        : <span className="badge badge-danger">Active</span>}
                    </td>
                    <td>
                      {!a.resolved && (
                        <button
                          className="btn btn-success btn-sm"
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
    </>
  );
}
