import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deviceApi, alertApi, sensorTypeApi } from '../services/api';

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sensor types panel state
  const [sensorTypes, setSensorTypes] = useState([]);
  const [stForm, setStForm] = useState({ sensorName: '', frequency: '' });
  const [stError, setStError] = useState('');
  const [stBusy, setStBusy] = useState(false);
  const [stOpen, setStOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [devs, alts, types] = await Promise.all([
          deviceApi.list(),
          alertApi.list({ resolved: false }),
          sensorTypeApi.list(),
        ]);
        setDevices(devs);
        setAlerts(alts);
        setSensorTypes(types);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const handleAddSensorType = async (e) => {
    e.preventDefault();
    setStError('');
    setStBusy(true);
    try {
      const created = await sensorTypeApi.create(stForm);
      setSensorTypes((prev) => [...prev, created]);
      setStForm({ sensorName: '', frequency: '' });
    } catch (err) {
      setStError(err.message);
    }
    setStBusy(false);
  };

  if (loading) return <div className="empty-state"><p>Loading dashboard...</p></div>;

  const unresolvedCount = alerts.length;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Devices</div>
          <div className="stat-value">{devices.length}</div>
        </div>
        <div className={`stat-card ${unresolvedCount > 0 ? 'danger' : 'success'}`}>
          <div className="stat-label">Active Alerts</div>
          <div className="stat-value">{unresolvedCount}</div>
        </div>
      </div>

      {/* Recent Devices */}
      <div className="card">
        <div className="card-header">
          <h3>Your Devices</h3>
          <Link to="/devices" className="btn btn-outline btn-sm">View All</Link>
        </div>
        {devices.length === 0 ? (
          <div className="empty-state">
            <p>No devices registered yet.</p>
            <Link to="/devices" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>Add Device</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Name</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {devices.slice(0, 5).map((d) => (
                  <tr key={d.deviceId}>
                    <td>{d.deviceId}</td>
                    <td>{d.deviceName || '—'}</td>
                    <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td><Link to={`/devices/${d.deviceId}`} className="btn btn-outline btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Alerts */}
      {unresolvedCount > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Active Alerts</h3>
            <Link to="/alerts" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Device</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 5).map((a) => (
                  <tr key={a.id}>
                    <td><span className="badge badge-danger">{a.type}</span></td>
                    <td>{a.message}</td>
                    <td>{a.deviceId}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sensor Types Panel */}
      <div className="card">
        <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setStOpen((o) => !o)}>
          <h3>Sensor Types ({sensorTypes.length})</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{stOpen ? '▲ Hide' : '▼ Manage'}</span>
        </div>

        {stOpen && (
          <>
            {sensorTypes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>No sensor types configured yet.</p>
            ) : (
              <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                <table>
                  <thead>
                    <tr><th>Name</th><th>Frequency</th></tr>
                  </thead>
                  <tbody>
                    {sensorTypes.map((s) => (
                      <tr key={s.id}>
                        <td>{s.sensorName}</td>
                        <td>{s.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form onSubmit={handleAddSensorType} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
                <label>Sensor Name</label>
                <input
                  type="text"
                  value={stForm.sensorName}
                  onChange={(e) => setStForm({ ...stForm, sensorName: e.target.value })}
                  placeholder="e.g. temperature"
                  required
                />
              </div>
              <div className="form-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
                <label>Frequency</label>
                <select
                  value={stForm.frequency}
                  onChange={(e) => setStForm({ ...stForm, frequency: e.target.value })}
                  required
                >
                  <option value="">Select…</option>
                  <option value="hourly">Hourly</option>
                  <option value="twice_daily">Twice Daily</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="realtime">Realtime</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {stError && <span className="error-msg" style={{ fontSize: '0.8rem' }}>{stError}</span>}
                <button type="submit" className="btn btn-primary btn-sm" disabled={stBusy}>
                  {stBusy ? 'Adding...' : '+ Add Sensor Type'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}
