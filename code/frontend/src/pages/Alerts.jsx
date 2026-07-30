import { useState, useEffect, useMemo, useCallback } from 'react';
import { deviceApi, alertApi } from '../services/api';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// alerts.css migrated to Tailwind below. @keyframes highlight-fade kept in <style> block.

/** Shared chip style base */
const CHIP_BASE = 'inline-block px-[0.65rem] py-[0.22rem] rounded-full text-xs font-bold tracking-[0.02em]';
const CHIP_UNRESOLVED = `${CHIP_BASE} bg-red-800/10 dark:bg-red-400/12 text-red-700 dark:text-red-300 border border-red-800/20 dark:border-red-400/25`;
const CHIP_RESOLVED   = `${CHIP_BASE} bg-green-800/8 dark:bg-green-400/10 text-green-700 dark:text-green-400 border border-green-800/20 dark:border-green-400/20`;

/** Glass input for selects and form controls */
const GLASS_SELECT = 'bg-white/40 dark:bg-white/[0.05] backdrop-blur-sm border-[1.5px] border-white/20 dark:border-white/10 rounded-[10px] text-text-main dark:text-[#e6edf3] px-[0.9rem] py-[0.65rem] text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]';

/** Pref toggle button builder */
function prefBtnClass(active, busy) {
  const base = 'h-[38px] min-w-[100px] px-4 py-[0.6rem] rounded-lg font-bold inline-flex items-center justify-center text-[0.95rem] cursor-pointer transition-all duration-200 disabled:opacity-50';
  return active
    ? `${base} bg-gradient-to-br from-success to-green-700 text-white hover:-translate-y-px hover:shadow-[0_4px_8px_rgba(34,197,94,0.3)]`
    : `${base} bg-gradient-to-br from-danger to-red-700 text-white hover:-translate-y-px hover:shadow-[0_4px_8px_rgba(239,68,68,0.3)]`;
}

export default function Alerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role, updateProfile } = useAuth();
  const [togglingPref, setTogglingPref] = useState(null);
  const [prefSuccess, setPrefSuccess] = useState('');
  const [prefError, setPrefError] = useState('');

  const handleTogglePreference = async (type) => {
    setTogglingPref(type);
    setPrefSuccess('');
    setPrefError('');
    try {
      if (type === 'email') {
        const nextValue = !user.emailAlertsEnabled;
        await updateProfile({ emailAlertsEnabled: nextValue });
        setPrefSuccess(`Email alerts successfully ${nextValue ? 'enabled' : 'disabled'}.`);
      } else if (type === 'telegram') {
        const nextValue = !user.telegramAlertsEnabled;
        await updateProfile({ telegramAlertsEnabled: nextValue });
        setPrefSuccess(`Telegram alerts successfully ${nextValue ? 'enabled' : 'disabled'}.`);
      }
      setTimeout(() => setPrefSuccess(''), 4000);
    } catch (err) {
      setPrefError(err.message || 'Failed to update preferences.');
      setTimeout(() => setPrefError(''), 4000);
    } finally {
      setTogglingPref(null);
    }
  };

  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [highlightedActive, setHighlightedActive] = useState(false);
  const location = useLocation();

  const currentFilters = useMemo(() => ({
    deviceId: searchParams.get('device_id') || '',
    resolved: searchParams.get('resolved') || 'false'
  }), [searchParams]);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const storedAlerts = await alertApi.list({
        tankId: currentFilters.deviceId,
        resolved: currentFilters.resolved === 'all' ? undefined : currentFilters.resolved
      });
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
  }, [currentFilters]);

  useEffect(() => {
    deviceApi.list().then(setDevices).catch(console.error);
  }, []);

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 30000);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  useEffect(() => {
    if (location.hash && location.hash.startsWith('#alert-')) {
      const id = location.hash.replace('#alert-', '');
      setHighlightedId(id);
      setTimeout(() => setHighlightedId(null), 3000);
    }
    if (searchParams.get('highlight') === 'active') {
      setHighlightedActive(true);
      setTimeout(() => setHighlightedActive(false), 3000);
    }
  }, [location, searchParams]);

  const handleFilterChange = (field) => (e) => {
    const nextValue = e.target.value;
    const nextParams = new URLSearchParams(searchParams);
    if (nextValue) {
      nextParams.set(field, nextValue);
    } else {
      nextParams.delete(field);
    }
    setSearchParams(nextParams);
  };

  const latestCategoryAlerts = useMemo(() => {
    const map = {};
    alerts.forEach(a => {
      if (a.resolved) return;
      const type = a.type.toLowerCase();
      if (!map[type] || new Date(a.createdAt) > new Date(map[type].createdAt)) {
        map[type] = a;
      }
    });
    return new Set(Object.values(map).map(a => a.id));
  }, [alerts]);

  const handleResolve = async (alertId) => {
    setResolving(alertId);
    try {
      await alertApi.resolve(alertId);
      await loadAlerts();
    } catch (err) {
      alert(err.message || "Failed to resolve alert");
    }
    setResolving(null);
  };

  return (
    <>
      {/*
        .highlighted-row + @keyframes highlight-fade cannot be expressed in Tailwind
        (it uses box-shadow inset animation). Kept as a minimal self-contained style block.
      */}
      <style>{`
        @keyframes highlight-fade {
          0%   { background-color: rgba(254,226,226,0.60); box-shadow: inset 4px 0 0 #ef4444; }
          70%  { background-color: rgba(254,226,226,0.30); box-shadow: inset 4px 0 0 #ef4444; }
          100% { background-color: transparent;             box-shadow: inset 0 0 0 transparent; }
        }
        .highlighted-row { animation: highlight-fade 3s ease-out forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* .alerts-page → transparent full-bleed */}
      <div className="min-h-[calc(100vh-62px)] -mx-7 px-7 py-7 bg-transparent">

        {/* Filter Card — .card.alerts-filter-card */}
        <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl p-6 mb-6" id="alerts-filter-card">
          <div className="flex flex-wrap gap-4 items-end">

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#204968] dark:text-slate-400">Device</label>
              <select
                className={GLASS_SELECT}
                value={currentFilters.deviceId}
                onChange={handleFilterChange('device_id')}
              >
                <option value="">All devices</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.deviceId} — {d.deviceName || 'Unnamed'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#204968] dark:text-slate-400">Status</label>
              <select
                className={GLASS_SELECT}
                value={currentFilters.resolved}
                onChange={handleFilterChange('resolved')}
              >
                <option value="all">All</option>
                <option value="false">Active</option>
                <option value="true">Resolved</option>
              </select>
            </div>

            {/* Preferences section — ADMIN / USER only */}
            {user && (role === 'ADMIN' || role === 'USER') && (
              /* .alerts-preferences-inline → flex gap-3 ml-auto items-end */
              <div className="flex gap-3 ml-auto items-end max-[900px]:ml-0 max-[900px]:w-full max-[900px]:mt-4 max-[900px]:pt-4 max-[900px]:border-t max-[900px]:border-dashed max-[900px]:border-white/20">

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-[#204968] dark:text-slate-400">📧 Email Alerts</label>
                  <button
                    type="button"
                    className={prefBtnClass(user.emailAlertsEnabled, togglingPref === 'email')}
                    onClick={() => handleTogglePreference('email')}
                    disabled={togglingPref === 'email'}
                  >
                    {user.emailAlertsEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex flex-col gap-1 relative">
                  <label className="text-sm font-semibold text-[#204968] dark:text-slate-400">🤖 Telegram Alerts</label>
                  <button
                    type="button"
                    className={prefBtnClass(user.telegramAlertsEnabled, togglingPref === 'telegram')}
                    onClick={() => handleTogglePreference('telegram')}
                    disabled={togglingPref === 'telegram'}
                  >
                    {user.telegramAlertsEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                  {/* .pref-inline-feedback */}
                  {(prefSuccess || prefError) && (
                    <div
                      className={[
                        'absolute top-[-24px] left-0 text-[0.72rem] font-bold px-[6px] py-[2px] rounded whitespace-nowrap',
                        prefSuccess
                          ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
                          : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
                      ].join(' ')}
                      style={{ animation: 'fadeIn 0.3s ease-out' }}
                    >
                      {prefSuccess || prefError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Card — .card.alerts-table-card */}
        <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden" id="alerts-table-card">
          {loading ? (
            <div className="p-12 text-center text-text-muted">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center text-text-muted">No alerts match the current filters.</div>
          ) : (
            /* .alerts-table-wrap → overflow-x-auto */
            <div className="overflow-x-auto rounded-xl border border-white/20 dark:border-white/[0.06]">
              <table className="w-full border-collapse">
                <thead className="bg-sky-400/6 dark:bg-white/[0.04]">
                  <tr>
                    {['Type', 'Message', 'Value', 'Device', 'Time', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-text-muted dark:text-slate-400 text-[0.78rem] uppercase tracking-[0.6px] font-bold border-b border-white/10">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => {
                    const isLatestForCategory = latestCategoryAlerts.has(a.id);
                    const isHighlighted = a.id === highlightedId || (highlightedActive && isLatestForCategory);
                    return (
                      <tr
                        key={a.id}
                        id={`alert-${a.id}`}
                        className={[
                          'border-b border-white/10 dark:border-white/[0.05] hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors',
                          isHighlighted ? 'highlighted-row' : '',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3 text-text-main dark:text-[#e6edf3]">
                          <span className={a.resolved ? CHIP_RESOLVED : CHIP_UNRESOLVED}>{a.type}</span>
                        </td>
                        <td className="px-4 py-3 text-text-main dark:text-[#e6edf3] text-sm">{a.message}</td>
                        <td className="px-4 py-3 text-text-main dark:text-[#e6edf3] text-sm font-mono">{a.value}</td>
                        <td className="px-4 py-3 text-text-main dark:text-[#e6edf3] text-sm">
                          {a.deviceId} {a.tankName ? `(${a.tankName})` : ''}
                        </td>
                        <td className="px-4 py-3 text-text-muted dark:text-slate-400 text-sm whitespace-nowrap">
                          {new Date(a.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={a.resolved ? CHIP_RESOLVED : CHIP_UNRESOLVED}>
                            {a.resolved ? 'Resolved' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {!a.resolved && (
                            /* .alerts-resolve-btn */
                            <button
                              className="border border-primary/35 dark:border-sky-400/30 bg-primary/12 dark:bg-sky-400/10 text-primary dark:text-sky-400 px-[0.85rem] py-[0.35rem] rounded-lg text-[0.78rem] font-bold cursor-pointer hover:bg-primary/22 hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(14,165,233,0.20)] disabled:opacity-50 transition-all"
                              onClick={() => handleResolve(a.id)}
                              disabled={resolving === a.id}
                            >
                              {resolving === a.id ? '...' : 'Resolve'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
