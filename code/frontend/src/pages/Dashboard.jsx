import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deviceApi, sensorApi, alertApi } from '../services/api';
import { SENSOR_META } from '../constants/sensorConstants';
import useOnlineStatus from '../hooks/useOnlineStatus';
import SensorGauge from '../components/SensorGauge';
import WaterTankLevel from '../components/WaterTankLevel';
import { getSocket } from '../services/socket';
// dashboard.css migrated to Tailwind below (gauge classes are now in SensorGauge.jsx).

function TankCard({ device, readings, recentAlerts }) {
  const { isOnline } = useOnlineStatus(device.currentStats?.lastReadingTime);

  return (
    /*
      .tank-card → dual-mode glass panel
      Light: bg-white/72 backdrop-blur-[20px] border border-white/80
      Dark:  dark:bg-[rgba(8,15,26,0.88)] dark:border-sky-400/15
    */
    <div className="bg-white/72 dark:bg-[rgba(8,15,26,0.88)] backdrop-blur-[20px] rounded-[20px] border border-white/80 dark:border-sky-400/15 p-6 w-full min-h-64 flex flex-col shadow-[0_8px_28px_rgba(14,52,84,0.10),0_2px_8px_rgba(14,52,84,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.50)] transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(14,52,84,0.18),0_0_20px_rgba(14,165,233,0.10)] hover:border-sky-400/40 dark:hover:border-sky-400/35">

      {/* .tank-card-main-link */}
      <Link to={`/devices/${device.deviceId}`} className="no-underline text-inherit flex-1 flex flex-col">

        {/* .tank-card-header → flex justify-between items-center mb-4 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[1.15rem] font-bold text-[#1e293b] dark:text-[#f0f6fc] tracking-[-0.01em]">
            {device.deviceName || `Tank ${device.deviceId}`}
          </span>
          {/* Online status dot */}
          <span
            className={[
              'w-5 h-5 rounded-full flex-shrink-0',
              isOnline
                ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.55),0_0_16px_rgba(34,197,94,0.25)]'
                : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.55)]',
            ].join(' ')}
          />
        </div>

        {/* Hardware Fault Banner */}
        {(() => {
          const brokenSensors = [];
          if (device.tempOk === false)  brokenSensors.push('Temp');
          if (device.waterOk === false) brokenSensors.push('Water Level');
          if (device.tdsOk === false)   brokenSensors.push('TDS');
          if (device.phOk === false)    brokenSensors.push('pH');
          if (device.turbOk === false)  brokenSensors.push('Turbidity');
          if (brokenSensors.length === 0) return null;
          return (
            <div className="bg-red-500 text-white px-3 py-[6px] text-xs font-bold flex items-center gap-[6px] border-b border-red-700 -mx-6 mb-3">
              🔌 Hardware Fault: {brokenSensors.join(', ')} disconnected
            </div>
          );
        })()}

        {/* .sensor-tile-grid → grid auto-fit with min 100px */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3 mt-2 items-center">
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
            <p className="text-text-muted dark:text-slate-600 text-[0.8rem] col-span-full text-center py-3">
              No readings yet
            </p>
          )}
        </div>
      </Link>

      {/* .tank-card-alert-link */}
      {Object.keys(recentAlerts[device.deviceId] || {}).length > 0 && (
        <Link
          to={`/alerts?device_id=${device.deviceId}&highlight=active`}
          className="no-underline block mt-4"
        >
          {/* .tank-card-alert */}
          <div className="bg-red-500/15 border border-red-500/40 rounded-xl px-[0.85rem] py-[0.55rem] flex items-center gap-2 text-red-300 text-[0.8rem] font-semibold transition-all hover:bg-red-500/25 hover:scale-[1.01]">
            <span className="text-base">⚠️</span>
            <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
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

        const dbAlerts = await alertApi.list({ resolved: false });
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
          if (rName === dType) return { ...r, value: data.value, readingTime: data.timestamp };
          return r;
        })
      }));

      setDevices(prev => prev.map(d => {
        if (d.deviceId === data.tankId) {
          return { ...d, currentStats: { ...d.currentStats, lastReadingTime: data.timestamp } };
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
            ...d, status,
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
            tempOk:  health.temp_ok  ?? true,
            waterOk: health.water_ok ?? true,
            tdsOk:   health.tds_ok   ?? true,
            phOk:    health.ph_ok    ?? true,
            turbOk:  health.turb_ok  ?? true,
          };
        }
        return d;
      }));
    };

    socket.on('sensor_data',           handleSensorData);
    socket.on('alert_resolved_auto',   handleAlertResolved);
    socket.on('alert_resolved_all',    handleAlertResolved);
    socket.on('device_status',         handleDeviceStatus);
    socket.on('sensor_health',         handleSensorHealth);

    return () => {
      socket.off('sensor_data',          handleSensorData);
      socket.off('alert_resolved_auto',  handleAlertResolved);
      socket.off('alert_resolved_all',   handleAlertResolved);
      socket.off('device_status',        handleDeviceStatus);
      socket.off('sensor_health',        handleSensorHealth);
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

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh] text-text-muted text-lg">
      Loading dashboard...
    </div>
  );

  return (
    /* .dashboard-page → transparent, full-bleed to use the body mesh gradient */
    <div className="min-h-[calc(100vh-62px)] -mx-7 px-7 py-7 bg-transparent">

      {/* Top Header Row with Compact Stat Cards and Search */}
      <div className="flex items-center justify-between mb-7 gap-4 flex-wrap">
        
        {/* Compact Stat Cards */}
        <div className="flex items-center gap-4 flex-wrap" id="dash-stats">
          {/* Compact Total Devices Box */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white/60 dark:bg-slate-800/40 backdrop-blur-[20px] border border-white/40 dark:border-white/10 rounded-xl border-l-4 border-l-primary shadow-xs">
            <span className="text-[0.7rem] text-text-muted dark:text-slate-400 uppercase tracking-[0.6px] font-bold whitespace-nowrap">Total Devices</span>
            <span className="text-[1.1rem] font-bold text-text-main dark:text-[#e6edf3] font-mono leading-none">{devices.length}</span>
          </div>

          {/* Compact Active Alerts Box */}
          <div className={[
            'flex items-center gap-2.5 px-3.5 py-1.5 bg-white/60 dark:bg-slate-800/40 backdrop-blur-[20px] border border-white/40 dark:border-white/10 rounded-xl border-l-4 shadow-xs',
            unresolvedCount > 0 ? 'border-l-danger' : 'border-l-success',
          ].join(' ')}>
            <span className="text-[0.7rem] text-text-muted dark:text-slate-400 uppercase tracking-[0.6px] font-bold whitespace-nowrap">Active Alerts</span>
            <span className="text-[1.1rem] font-bold text-text-main dark:text-[#e6edf3] font-mono leading-none">{unresolvedCount}</span>
          </div>
        </div>

        {/* Search Bar */}
        <input
          className="w-full max-w-[340px] px-5 py-[0.55rem] rounded-full border-[1.5px] border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/[0.06] backdrop-blur-sm text-[#0e3454] dark:text-[#e6edf3] text-[0.95rem] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
          type="text"
          placeholder="Search here..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tank Grid — .dash-main-grid / .dash-tanks / .tank-grid */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p>No tanks found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-1 gap-6">
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
    </div>
  );
}
