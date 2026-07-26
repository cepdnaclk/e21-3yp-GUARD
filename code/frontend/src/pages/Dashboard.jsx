import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deviceApi, sensorApi, alertApi } from '../services/api';
import { SENSOR_META } from '../constants/sensorConstants';
import useOnlineStatus from '../hooks/useOnlineStatus';
import SensorGauge from '../components/SensorGauge';
import WaterTankLevel from '../components/WaterTankLevel';
import { getSocket } from '../services/socket';
import '../styles/dashboard.css';

function TankCard({ device, readings, recentAlerts, onSensorUpdate, onMarkSeen }) {
  const { isOnline } = useOnlineStatus(device.currentStats?.lastReadingTime);

  // Real-time socket updates bubble up from the parent, but we track online per-card here.
  // The parent calls onMarkSeen when socket data arrives for this device.

  return (
    <div className="tank-card">
      <Link to={`/devices/${device.deviceId}`} className="tank-card-main-link">
        <div className="tank-card-header">
          <span className="tank-name">{device.deviceName || `Tank ${device.deviceId}`}</span>
          <span className={`tank-status-dot ${isOnline ? 'active' : 'offline'}`} />
        </div>
        
        {/* Hardware Fault Banner */}
        {(() => {
          const brokenSensors = [];
          if (device.tempOk === false) brokenSensors.push('Temp');
          if (device.waterOk === false) brokenSensors.push('Water Level');
          if (device.tdsOk === false) brokenSensors.push('TDS');
          if (device.phOk === false) brokenSensors.push('pH');
          if (device.turbOk === false) brokenSensors.push('Turbidity');
          
          if (brokenSensors.length > 0) {
            return (
              <div className="hardware-fault-banner" style={{backgroundColor: '#ff4444', color: 'white', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #cc0000'}}>
                <span>🔌 Hardware Fault: {brokenSensors.join(', ')} disconnected</span>
              </div>
            );
          }
          return null;
        })()}
        <div className="sensor-tile-grid">
          {readings.length > 0 ? (
            readings.map((r) => {
              const name = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
              const meta = SENSOR_META[name];
              if (!meta) return null;

              const persistentAlert = recentAlerts[device.deviceId]?.[name];

              if (name === 'waterlevel') {
                return (
                  <WaterTankLevel
                    key={r.sensorId}
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
                  key={r.sensorId}
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
        <Link 
          to={`/alerts?device_id=${device.deviceId}&highlight=active`} 
          className="tank-card-alert-link"
        >
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

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState({});
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
        setSensorData(Object.fromEntries(results));

        // Fetch real alerts from the database
        const dbAlerts = await alertApi.list({ resolved: false });
        
        // Map of TankID -> { sensorType: latestAlert }
        const alertsByTankAndType = {};
        dbAlerts.forEach(a => {
          const tId = a.tankId;
          const sType = a.type.replace(/\s+/g, '').toLowerCase();
          
          if (!alertsByTankAndType[tId]) alertsByTankAndType[tId] = {};
          
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

      // Update the device's lastReadingTime so the online dot turns green instantly
      setDevices(prev => prev.map(d => {
        if (d.deviceId === data.tankId) {
          return {
            ...d,
            currentStats: {
              ...d.currentStats,
              lastReadingTime: data.timestamp
            }
          };
        }
        return d;
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

    const handleDeviceStatus = (data) => {
      const { tankId, status } = data;
      setDevices(prev => prev.map(d => {
        if (d.deviceId === tankId) {
          return {
            ...d,
            status,
            currentStats: {
              ...d.currentStats,
              lastReadingTime: status === 'online' ? new Date().toISOString() : '1970-01-01T00:00:00.000Z'
            }
          };
        }
        return d;
      }));
    };

    const handleSensorHealth = (data) => {
      const { tankId, health } = data;
      setDevices(prev => prev.map(d => {
        if (d.deviceId === tankId) {
          return {
            ...d,
            tempOk: health.temp_ok ?? true,
            waterOk: health.water_ok ?? true,
            tdsOk: health.tds_ok ?? true,
            phOk: health.ph_ok ?? true,
            turbOk: health.turb_ok ?? true
          };
        }
        return d;
      }));
    };

    socket.on('sensor_data', handleSensorData);
    socket.on('alert_resolved_auto', handleAlertResolved);
    socket.on('alert_resolved_all', handleAlertResolved);
    socket.on('device_status', handleDeviceStatus);
    socket.on('sensor_health', handleSensorHealth);

    return () => {
      socket.off('sensor_data', handleSensorData);
      socket.off('alert_resolved_auto', handleAlertResolved);
      socket.off('alert_resolved_all', handleAlertResolved);
      socket.off('device_status', handleDeviceStatus);
      socket.off('sensor_health', handleSensorHealth);
    };
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

      {/* Main grid: tank cards */}
      <div className="dash-main-grid">
        <div className="dash-tanks">
          {filtered.length === 0 ? (
            <div className="empty-state"><p>No tanks found.</p></div>
          ) : (
            <div className="tank-grid">
              {filtered.map((d) => (
                <TankCard
                  key={d.deviceId}
                  device={d}
                  readings={sensorData[d.deviceId] || []}
                  recentAlerts={recentAlerts}
                />
              ))}
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
