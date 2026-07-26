import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { SENSOR_META } from '../../constants/sensorConstants';
import SensorGauge from '../../components/SensorGauge';
import WaterTankLevel from '../../components/WaterTankLevel';
import '../../styles/dashboard.css';

/**
 * TankCard — identical to production Dashboard's TankCard, but receives
 * demo data instead of live API data. No socket listeners needed.
 */
function TankCard({ device, readings, recentAlerts }) {
  return (
    <div className="tank-card" id={device.deviceId === 'GUARD-D01' ? 'tank-card-first' : undefined}>
      <Link to={`/demo/devices`} className="tank-card-main-link">
        <div className="tank-card-header">
          <span className="tank-name">{device.deviceName || `Tank ${device.deviceId}`}</span>
          <span className="tank-status-dot active" />
        </div>

        <div className="sensor-tile-grid">
          {readings.length > 0 ? (
            readings.map((r, i) => {
              const name = (r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
              const meta = SENSOR_META[name];
              if (!meta) return null;

              const persistentAlert = recentAlerts[device.deviceId]?.[name];

              if (name === 'waterlevel') {
                return (
                  <WaterTankLevel
                    key={i}
                    label={meta.label}
                    value={r.value}
                    unit={meta.unit}
                    minThreshold={device[meta.minKey]}
                    maxThreshold={device[meta.maxKey]}
                    rangeMin={meta.rMin}
                    rangeMax={meta.rMax}
                    isPersistentAlert={!!persistentAlert}
                  />
                );
              }

              return (
                <SensorGauge
                  key={i}
                  label={meta.label}
                  value={r.value}
                  unit={meta.unit}
                  minThreshold={device[meta.minKey]}
                  maxThreshold={device[meta.maxKey]}
                  rangeMin={meta.rMin}
                  rangeMax={meta.rMax}
                  isPersistentAlert={!!persistentAlert}
                  isInverted={meta.isInverted}
                />
              );
            })
          ) : (
            <p className="no-readings">No readings yet</p>
          )}
        </div>
      </Link>

      {Object.keys(recentAlerts[device.deviceId] || {}).length > 0 && (
        <Link to="/demo/alerts" className="tank-card-alert-link">
          <div className="tank-card-alert">
            <span className="alert-icon">⚠️</span>
            <span className="alert-text">
              Active Issues ({Object.keys(recentAlerts[device.deviceId]).length})
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}

export default function DashboardDemo() {
  const { demoDevices, demoSensorData, demoAlerts } = useDemo();
  const [search, setSearch] = useState('');

  // Build recentAlerts map from demo alerts (only unresolved)
  const recentAlerts = {};
  demoAlerts.filter(a => !a.resolved).forEach(a => {
    const sType = a.type.replace(/\s+/g, '').toLowerCase();
    if (!recentAlerts[a.tankId]) recentAlerts[a.tankId] = {};
    recentAlerts[a.tankId][sType] = a;
  });

  const unresolvedCount = demoAlerts.filter(a => !a.resolved).length;

  const filtered = demoDevices.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(d.deviceId).toLowerCase().includes(q) ||
      (d.deviceName && d.deviceName.toLowerCase().includes(q))
    );
  });

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

      {/* Main grid: tank cards */}
      <div className="dash-main-grid">
        <div className="dash-tanks">
          {filtered.length === 0 ? (
            <div className="empty-state"><p>No tanks found.</p></div>
          ) : (
            <div className="tank-grid" id="tank-grid">
              {filtered.map((d) => (
                <TankCard
                  key={d.deviceId}
                  device={d}
                  readings={demoSensorData[d.deviceId] || []}
                  recentAlerts={recentAlerts}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="dash-stats" id="dash-stats">
        <div className="dash-stat-card">
          <div className="stat-label">Total Devices</div>
          <div className="stat-value">{demoDevices.length}</div>
        </div>
        <div className={`dash-stat-card ${unresolvedCount > 0 ? 'danger' : 'success'}`}>
          <div className="stat-label">Active Alerts</div>
          <div className="stat-value">{unresolvedCount}</div>
        </div>
      </div>
    </div>
  );
}
