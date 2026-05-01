import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deviceApi, sensorApi, alertApi } from '../services/api';
import SensorGauge from '../components/SensorGauge';
import WaterTankLevel from '../components/WaterTankLevel';
import { getSocket } from '../services/socket';
import '../styles/dashboard.css';

const SENSOR_META = {
  temperature: { label: 'TEMP', unit: '°C', minKey: 'tempMin', maxKey: 'tempMax', rMin: 0, rMax: 50 },
  ph: { label: 'pH', unit: '', minKey: 'phMin', maxKey: 'phMax', rMin: 0, rMax: 14 },
  tds: { label: 'TDS', unit: 'ppm', minKey: 'tdsMin', maxKey: 'tdsMax', rMin: 0, rMax: 2000 },
  turbidity: { label: 'TURB', unit: 'NTU', maxKey: 'turbidityMax', rMin: 0, rMax: 1000 },
  waterlevel: { label: 'LEVEL', unit: 'cm', minKey: 'waterLevelThreshold', maxKey: 'waterStopThreshold', rMin: 0, rMax: 200, isInverted: true },
};

function buildAlertsFromDeviceState(devices, sensorData) {
  const alerts = [];

  for (const device of devices) {
    const readings = sensorData[device.deviceId] || [];
    const hasReadings = readings.length > 0;
    const lastTime = device.currentStats?.lastReadingTime;
    const isRecentlyUpdated = lastTime && (new Date() - new Date(lastTime)) < 30000;

    if (!hasReadings || !isRecentlyUpdated) {
      alerts.push({
        id: `${device.deviceId}-offline`,
        type: `${device.deviceName || `Tank ${device.deviceId}`} appears offline`,
        resolved: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  return alerts;
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [lastSeen, setLastSeen] = useState({}); // Track real-time online status
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [sensorData, setSensorData] = useState({});
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(new Date()); // Force re-render for timeout check

  // Periodically update 'now' to trigger timeout re-evaluations
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);
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

        // Fetch real alerts from the database
        const dbAlerts = await alertApi.list({ resolved: false });
        
        // Map of TankID -> { sensorType: latestAlert }
        const alertsByTankAndType = {};
        dbAlerts.forEach(a => {
          const tId = a.tankId;
          const sType = a.type.replace(/\s+/g, '').toLowerCase(); // match SENSOR_META keys
          
          if (!alertsByTankAndType[tId]) alertsByTankAndType[tId] = {};
          
          // Keep the latest unresolved for this category
          if (!alertsByTankAndType[tId][sType] || 
              new Date(a.createdAt) > new Date(alertsByTankAndType[tId][sType].createdAt)) {
            alertsByTankAndType[tId][sType] = a;
          }
        });

        setRecentAlerts(alertsByTankAndType);
        setUnresolvedCount(dbAlerts.length);
      } catch (err) { 
        console.error("Dashboard load error:", err);
      }
      setLoading(false);
    }
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  // Real-time updates via Socket.io
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleSensorData = (data) => {
      // Update sensor data state
      setSensorData(prev => ({
        ...prev,
        [data.tankId]: (prev[data.tankId] || []).map(r => {
          const rName = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
          const dType = data.sensorType.replace(/\s+/g, '').toLowerCase();
          if (rName === dType) {
            return { ...r, value: data.value, readingTime: data.timestamp };
          }
          return r;
        })
      }));

      // Update real-time online status
      setLastSeen(prev => ({
        ...prev,
        [data.tankId]: new Date()
      }));
    };

    const handleAlertResolved = (data) => {
      const { tankId, sensorType } = data;
      const sType = sensorType.replace(/\s+/g, '').toLowerCase();

      setRecentAlerts(prev => {
        const tankAlerts = { ...prev[tankId] };
        delete tankAlerts[sType];
        return { ...prev, [tankId]: tankAlerts };
      });
    };

    socket.on('sensor_data', handleSensorData);
    socket.on('alert_resolved_auto', handleAlertResolved);
    socket.on('alert_resolved_all', handleAlertResolved);

    return () => {
      socket.off('sensor_data', handleSensorData);
      socket.off('alert_resolved_auto', handleAlertResolved);
      socket.off('alert_resolved_all', handleAlertResolved);
    };
  }, []); // Only run once to setup listeners

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
                const initialLastTime = d.currentStats?.lastReadingTime;
                const realTimeLastTime = lastSeen[d.deviceId];
                
                const effectiveLastTime = realTimeLastTime || (initialLastTime ? new Date(initialLastTime) : null);
                
                // 30s Timeout logic (checked against the 'now' state)
                const isRecentlyUpdated = effectiveLastTime && (now - effectiveLastTime) < 30000;
                const isActive = !!isRecentlyUpdated;

                return (
                  <div key={d.deviceId} className="tank-card">
                    <Link to={`/devices/${d.deviceId}`} className="tank-card-main-link">
                      <div className="tank-card-header">
                        <span className="tank-name">{d.deviceName || `Tank ${d.deviceId}`}</span>
                        <span className={`tank-status-dot ${isActive ? 'active' : 'offline'}`} />
                      </div>
                      <div className="sensor-tile-grid">
                        {readings.length > 0 ? (
                          readings.map((r) => {
                            const name = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
                            const meta = SENSOR_META[name];
                            if (!meta) return null;

                            const persistentAlert = recentAlerts[d.deviceId]?.[name];

                            if (name === 'waterlevel') {
                              return (
                                <WaterTankLevel
                                  key={r.sensorId}
                                  label={meta.label}
                                  value={r.value}
                                  unit={meta.unit}
                                  minThreshold={d[meta.minKey]}
                                  maxThreshold={d[meta.maxKey]}
                                  rangeMin={meta.rMin}
                                  rangeMax={meta.rMax}
                                  isPersistentAlert={!!persistentAlert}
                                />
                              );
                            }

                            return (
                              <SensorGauge
                                key={r.sensorId}
                                label={meta.label}
                                value={r.value}
                                unit={meta.unit}
                                minThreshold={d[meta.minKey]}
                                maxThreshold={d[meta.maxKey]}
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
                    
                    {Object.keys(recentAlerts[d.deviceId] || {}).length > 0 && (
                      <Link 
                        to={`/alerts?device_id=${d.deviceId}&highlight=active`} 
                        className="tank-card-alert-link"
                      >
                        <div className="tank-card-alert">
                          <span className="alert-icon">⚠️</span>
                          <span className="alert-text">
                            Active Issues ({Object.keys(recentAlerts[d.deviceId]).length})
                          </span>
                        </div>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
