import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deviceApi, sensorApi } from '../services/api';
import '../styles/dashboard.css';

function buildAlertsFromDeviceState(devices, sensorData) {
  const alerts = [];

  for (const device of devices) {
    const readings = sensorData[device.deviceId] || [];
    const hasReadings = readings.length > 0;

    if (!hasReadings || device.status !== 'online') {
      alerts.push({
        id: `${device.deviceId}-offline`,
        type: `${device.deviceName || `Tank ${device.deviceId}`} appears offline`,
        resolved: false,
      });
    }
  }

  return alerts;
}

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [sensorData, setSensorData] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const devs = await deviceApi.list();
        setDevices(devs);

        const results = await Promise.all(
          devs.map(async (d) => {
            try {
              const readings = await sensorApi.latest(d.deviceId);
              return [d.deviceId, Array.isArray(readings) ? readings : []];
            } catch {
              return [d.deviceId, []];
            }
          })
        );
        const nextSensorData = Object.fromEntries(results);
        setSensorData(nextSensorData);

        const allAlerts = buildAlertsFromDeviceState(devs, nextSensorData);
        setRecentAlerts(allAlerts.slice(0, 6));
        setUnresolvedCount(allAlerts.filter((a) => !a.resolved).length);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = devices.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(d.deviceId).toLowerCase().includes(q) ||
      (d.deviceName && d.deviceName.toLowerCase().includes(q))
    );
  });

  if (loading) return <div className="empty-state"><p>Loading dashboard...</p></div>;

  return (
    <div className="dashboard-page">

      {/* Search Bar */}
      <div className="dash-search-wrap">
        <h1 className="dash-title">Dashboard</h1>
        <input
          className="dash-search"
          type="text"
          placeholder="Search here..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Main grid: tank cards + alerts panel */}
      <div className="dash-main-grid">

        {/* Tank Cards */}
        <div className="dash-tanks">
          {filtered.length === 0 ? (
            <div className="empty-state"><p>No tanks found.</p></div>
          ) : (
            <div className="tank-grid">
              {filtered.map((d) => {
                const readings = sensorData[d.deviceId] || [];
                const isActive = readings.length > 0;
                return (
                  <Link to={`/devices/${d.deviceId}`} key={d.deviceId} className="tank-card-link">
                    <div className="tank-card">
                      <div className="tank-card-header">
                        <span className="tank-name">{d.deviceName || `Tank ${d.deviceId}`}</span>
                        <span className={`tank-status-dot${isActive ? ' active' : ''}`} />
                      </div>
                      <div className="sensor-tile-grid">
                        {readings.length > 0 ? (
                          readings.map((r) => (
                            <div key={r.sensorId} className="sensor-tile">
                              <span className="sensor-tile-name">
                                {r.sensorType?.sensorName ?? r.sensorTypeName ?? 'Sensor'}
                              </span>
                              <span className="sensor-tile-value">{r.value}</span>
                            </div>
                          ))
                        ) : (
                          <p className="no-readings">No readings yet</p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Alerts Panel */}
        <div className="dash-alerts-panel">
          <div className="alerts-panel-header">
            <span>Recent Alerts</span>
            <Link to="/alerts">Show all</Link>
          </div>
          <div className="alerts-panel-list">
            {recentAlerts.length === 0 ? (
              <p className="no-readings" style={{ paddingTop: '0.5rem' }}>No alerts.</p>
            ) : (
              recentAlerts.map((a) => (
                <div key={a.id} className={`alert-bar ${a.resolved ? 'resolved' : 'unresolved'}`}>
                  {a.type}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="stat-label">Total Devices</div>
          <div className="stat-value">{devices.length}</div>
        </div>
        <div className={`dash-stat-card ${unresolvedCount > 0 ? 'danger' : 'success'}`}>
          <div className="stat-label">Active Alerts</div>
          <div className="stat-value">{unresolvedCount}</div>
        </div>
      </div>
    </div>
  );
}
