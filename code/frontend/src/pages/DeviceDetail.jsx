import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deviceApi, authApi, extractReadingsFromDevice } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SENSOR_UNITS } from '../constants/sensorConstants';
import useOnlineStatus from '../hooks/useOnlineStatus';
import TankTimeSeriesChart from '../components/TankTimeSeriesChart';
import ThresholdsPanel from '../components/ThresholdsPanel';
import ActuatorPanel from '../components/ActuatorPanel';
import { getSocket } from '../services/socket';
import '../styles/device-detail.css'; /* styles migrated — kept for btn-danger reference only, see note below */

function buildLocalAlerts(device, readings) {
  const nextAlerts = [];

  if (!device || !readings) return nextAlerts;

  readings.forEach(r => {
    const name = (r.sensorType?.sensorName || r.sensorTypeName || '').toLowerCase();
    const val = r.value;

    if (name === 'temperature' && device.thresholds?.tempMin != null && device.thresholds?.tempMax != null) {
      if (val < device.thresholds.tempMin) {
        nextAlerts.push({ id: `local-temp-min`, type: 'Temperature Low', message: `Temperature is low (${val}°C < ${device.thresholds.tempMin}°C)` });
      } else if (val > device.thresholds.tempMax) {
        nextAlerts.push({ id: `local-temp-max`, type: 'Temperature High', message: `Temperature is high (${val}°C > ${device.thresholds.tempMax}°C)` });
      }
    }

    if (name === 'ph' && device.thresholds?.phMin != null && device.thresholds?.phMax != null) {
      if (val < device.thresholds.phMin) {
        nextAlerts.push({ id: `local-ph-min`, type: 'pH Low', message: `pH is low (${val} < ${device.thresholds.phMin})` });
      } else if (val > device.thresholds.phMax) {
        nextAlerts.push({ id: `local-ph-max`, type: 'pH High', message: `pH is high (${val} > ${device.thresholds.phMax})` });
      }
    }

    if (name === 'tds' && device.thresholds?.tdsMin != null && device.thresholds?.tdsMax != null) {
      if (val < device.thresholds.tdsMin) {
        nextAlerts.push({ id: `local-tds-min`, type: 'TDS Low', message: `TDS is low (${val} ppm < ${device.thresholds.tdsMin} ppm)` });
      } else if (val > device.thresholds.tdsMax) {
        nextAlerts.push({ id: `local-tds-max`, type: 'TDS High', message: `TDS is high (${val} ppm > ${device.thresholds.tdsMax} ppm)` });
      }
    }

    if (name === 'turbidity' && device.thresholds?.turbidityMax != null) {
      if (val > device.thresholds.turbidityMax) {
        nextAlerts.push({ id: `local-turb-max`, type: 'Turbidity High', message: `Turbidity is high (${val} NTU > ${device.thresholds.turbidityMax} NTU)` });
      }
    }

    if (name === 'water level' || name === 'waterlevel') {
      if (device.thresholds?.waterLevelThreshold != null && val > device.thresholds.waterLevelThreshold) {
        nextAlerts.push({ id: `local-water-low`, type: 'Water Level Low', message: `Water level is low (distance ${val} cm > max ${device.thresholds.waterLevelThreshold} cm)` });
      } else if (device.thresholds?.waterStopThreshold != null && val < device.thresholds.waterStopThreshold) {
        nextAlerts.push({ id: `local-water-high`, type: 'Water Level High', message: `Water level is high (distance ${val} cm < min ${device.thresholds.waterStopThreshold} cm)` });
      }
    }
  });

  return nextAlerts;
}

export default function DeviceDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin only: list of all workers to assign from
  const [allWorkers, setAllWorkers] = useState([]);
  const [busy, setBusy] = useState(false);

  // Online status via shared hook
  const { isOnline, markSeen } = useOnlineStatus(device?.currentStats?.lastReadingTime);

  const loadData = async () => {
    try {
      const devPromise = deviceApi.get(id);
      const workersPromise = role === 'ADMIN' ? authApi.listWorkers() : Promise.resolve([]);

      const [dev, workers] = await Promise.all([devPromise, workersPromise]);
      const latest = extractReadingsFromDevice(dev);

      setDevice(dev);
      setReadings(latest);
      setAlerts(buildLocalAlerts(dev, latest));

      if (role === 'ADMIN') {
        setAllWorkers(workers);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30000);

    const socket = getSocket();
    if (socket) {
      const handleSensorData = (data) => {
        if (data.tankId === id) {
          markSeen();
          setReadings(prev => {
            const dType = data.sensorType.replace(/\s+/g, '').toLowerCase();
            return prev.map(r => {
              const rName = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
              if (rName === dType) {
                return { ...r, value: data.value, readingTime: data.timestamp };
              }
              return r;
            });
          });
        }
      };

      const handleDeviceStatus = (data) => {
        if (data.tankId === id) {
          setDevice(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              status: data.status,
              currentStats: {
                ...prev.currentStats,
                lastReadingTime: data.status === 'online' ? new Date().toISOString() : '1970-01-01T00:00:00.000Z'
              }
            };
          });
        }
      };

      socket.on('sensor_data', handleSensorData);
      socket.on('device_status', handleDeviceStatus);

      return () => {
        clearInterval(timer);
        socket.off('sensor_data', handleSensorData);
        socket.off('device_status', handleDeviceStatus);
      };
    }

    return () => clearInterval(timer);
  }, [id, role]);

  const handleAssign = async (userId) => {
    setBusy(true);
    try {
      await deviceApi.assignUser(id, userId);
      await loadData(); // Refresh device workers
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnassign = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this worker from this device?')) return;
    setBusy(true);
    try {
      await deviceApi.unassignUser(id, userId);
      await loadData(); // Refresh device workers
      alert('Worker removed successfully.');
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="empty-state"><p>Loading device...</p></div>;
  if (error) return <div className="empty-state"><p className="error-msg">{error}</p></div>;

  return (
    <div className="flex flex-col gap-6">
      {/* .device-detail-header → flex justify-between items-center mb-4 */}
      <div className="flex justify-between items-center mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h3>Device #{device.deviceId}</h3>
            {/* .device-detail-name → text-text-muted text-sm */}
            <p className="text-text-muted text-sm">
              {device.deviceName || 'Unnamed'}
            </p>
          </div>
          {/* Online status dot — mirrors tank-card pattern */}
          <span
            className={[
              'w-5 h-5 rounded-full flex-shrink-0',
              isOnline
                ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.55),0_0_16px_rgba(34,197,94,0.25)]'
                : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.55)]',
            ].join(' ')}
            title={isOnline ? 'Online' : 'Offline'}
          />
        </div>
        <Link to="/devices" className="btn btn-outline btn-sm">Back to Devices</Link>
      </div>

      {/* Latest Sensor Readings */}
      <div className="card">
        <div className="card-header">
          <h3>Latest Readings</h3>
          <Link to={`/analytics?device_id=${device?.deviceId || id}`} className="btn btn-outline btn-sm">View History</Link>
        </div>
        {readings.length === 0 ? (
          <div className="empty-state"><p>No sensor data received yet.</p></div>
        ) : (
          <div className="sensor-grid">
            {readings.map((r) => {
              const name = r.sensorType?.sensorName || `Sensor ${r.sensorId}`;
              const unit = SENSOR_UNITS[name.toLowerCase()] ?? '';
              return (
                <div
                  className="sensor-card !bg-[rgba(14,52,84,0.06)] dark:!bg-white/[0.04] !border-[rgba(14,52,84,0.10)] dark:!border-white/[0.06] transition-all duration-200 hover:-translate-y-1 hover:!bg-[rgba(14,52,84,0.10)] dark:hover:!bg-white/[0.07] hover:!border-[rgba(14,52,84,0.18)] dark:hover:!border-white/10"
                  key={r.id}
                >
                  <div className="sensor-name">{name}</div>
                  <div className="sensor-value">
                    {typeof r.value === 'number' ? r.value.toFixed(1) : r.value}{unit}
                  </div>
                  <div className="sensor-time">{new Date(r.readingTime).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Remote System Controls */}
      <ActuatorPanel tankId={id} />
      
      {/* Time Series Chart */}
      <TankTimeSeriesChart deviceId={id} autoRefreshMs={30000} isOnline={isOnline} />
      
      {/* Sensor Thresholds (ADMIN only) */}
      {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
        <ThresholdsPanel 
          tankId={id} 
          initialThresholds={device.thresholds} 
          onUpdate={loadData} 
        />
      )}

      {/* Worker Assignment (ADMIN only) */}
      {role === 'ADMIN' && (
        <div className="card">
          <div className="card-header">
            <h3>Assigned Workers ({device.workers?.length || 0})</h3>
            {/* <div className="worker-assign-form">
              <select 
                className="form-control" 
                defaultValue="" 
                onChange={(e) => e.target.value && handleAssign(e.target.value)}
                disabled={busy}
              >
                <option value="" disabled>Assign a worker...</option>
                {allWorkers
                  .filter(w => !device.workers?.some(aw => aw.id === w.id))
                  .map(w => (
                    <option key={w.id} value={w.id}>{w.fullName} ({w.username})</option>
                  ))
                }
              </select>
            </div> */}
          </div>
          {device.workers?.length === 0 ? (
            <div className="empty-state"><p>No workers assigned to this device.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {device.workers.map((w) => (
                    <tr key={w.id}>
                      <td>{w.fullName}</td>
                      <td>{w.username}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-outline btn-sm border-danger text-danger hover:bg-danger hover:text-white transition-all" 
                          onClick={() => handleUnassign(w.id)}
                          disabled={busy}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Device Alerts */}
      {alerts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Active Alerts ({alerts.length})</h3>
            <Link to="/alerts" className="btn btn-outline btn-sm">View All Alerts</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Message</th><th>Value</th><th>Time</th></tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td><span className="badge badge-danger">{a.type}</span></td>
                    <td>{a.message}</td>
                    <td>{a.value}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
