import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { SENSOR_META } from '../../constants/sensorConstants';
import SensorGauge from '../../components/SensorGauge';
import WaterTankLevel from '../../components/WaterTankLevel';
// dashboard.css migrated to Tailwind below (same classes as production Dashboard.jsx)

function TankCard({ device, readings, recentAlerts }) {
  return (
    <div
      className="bg-white/72 dark:bg-[rgba(8,15,26,0.88)] backdrop-blur-[20px] rounded-[20px] border border-white/80 dark:border-sky-400/15 p-6 w-full min-h-64 flex flex-col shadow-[0_8px_28px_rgba(14,52,84,0.10)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.50)] transition-all duration-[220ms] hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(14,52,84,0.18)] hover:border-sky-400/40 dark:hover:border-sky-400/35"
      id={device.deviceId === 'GUARD-D01' ? 'tank-card-first' : undefined}
    >
      <Link to="/demo/devices" className="no-underline text-inherit flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[1.15rem] font-bold text-[#1e293b] dark:text-[#f0f6fc] tracking-[-0.01em]">
            {device.deviceName || `Tank ${device.deviceId}`}
          </span>
          {/* Always online in demo */}
          <span className="w-5 h-5 rounded-full flex-shrink-0 bg-success shadow-[0_0_8px_rgba(34,197,94,0.55),0_0_16px_rgba(34,197,94,0.25)]" />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3 mt-2 items-center">
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
            <p className="text-text-muted dark:text-slate-600 text-[0.8rem] col-span-full text-center py-3">
              No readings yet
            </p>
          )}
        </div>
      </Link>

      {Object.keys(recentAlerts[device.deviceId] || {}).length > 0 && (
        <Link to="/demo/alerts" className="no-underline block mt-4">
          <div className="bg-red-500/15 border border-red-500/40 rounded-xl px-[0.85rem] py-[0.55rem] flex items-center gap-2 text-red-300 text-[0.8rem] font-semibold hover:bg-red-500/25 hover:scale-[1.01] transition-all">
            <span className="text-base">⚠️</span>
            <span className="flex-1">Active Issues ({Object.keys(recentAlerts[device.deviceId]).length})</span>
          </div>
        </Link>
      )}
    </div>
  );
}

export default function DashboardDemo() {
  const { demoDevices, demoSensorData, demoAlerts } = useDemo();
  const [search, setSearch] = useState('');

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
    return String(d.deviceId).toLowerCase().includes(q) || (d.deviceName && d.deviceName.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-[calc(100vh-62px)] -mx-7 px-7 py-7 bg-transparent">
      {/* Search bar */}
      <div className="flex justify-center items-center mb-7 gap-4 flex-wrap">
        <h1 className="text-[1.6rem] font-bold text-[#0e3454] dark:text-[#e6edf3] mr-auto tracking-tight">Dashboard</h1>
        <input
          className="w-full max-w-[520px] px-6 py-[0.65rem] rounded-full border-[1.5px] border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/[0.06] backdrop-blur-sm text-[#0e3454] dark:text-[#e6edf3] text-[0.95rem] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
          type="text"
          placeholder="Search here..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tank grid */}
      <div className="mb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-text-muted"><p>No tanks found.</p></div>
        ) : (
          <div className="grid grid-cols-3 lg:grid-cols-2 md:grid-cols-1 gap-6" id="tank-grid">
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

      {/* Stat Cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4" id="dash-stats">
        <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-[20px] border border-white/40 dark:border-white/10 rounded-[20px] p-7 border-l-4 border-l-primary hover:-translate-y-1 transition-transform">
          <div className="text-[0.75rem] text-text-muted dark:text-slate-400 uppercase tracking-[0.7px] font-bold">Total Devices</div>
          <div className="text-[2rem] font-bold mt-2 text-text-main dark:text-[#e6edf3] font-mono tracking-tight">{demoDevices.length}</div>
        </div>
        <div className={`bg-white/60 dark:bg-slate-800/40 backdrop-blur-[20px] border border-white/40 dark:border-white/10 rounded-[20px] p-7 border-l-4 hover:-translate-y-1 transition-transform ${unresolvedCount > 0 ? 'border-l-danger' : 'border-l-success'}`}>
          <div className="text-[0.75rem] text-text-muted dark:text-slate-400 uppercase tracking-[0.7px] font-bold">Active Alerts</div>
          <div className="text-[2rem] font-bold mt-2 text-text-main dark:text-[#e6edf3] font-mono tracking-tight">{unresolvedCount}</div>
        </div>
      </div>
    </div>
  );
}
