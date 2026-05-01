import { useState, useEffect, useMemo, useCallback } from 'react';
import { deviceApi, alertApi } from '../services/api';
import { useSearchParams, useLocation } from 'react-router-dom';
import '../styles/alerts.css';

export default function Alerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDeviceId = searchParams.get('device_id') || '';
  const initialResolved = searchParams.get('resolved') || 'false';

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
      // Load stored alerts from backend (MQTT alerts)
      const storedAlerts = await alertApi.list({
        tankId: currentFilters.deviceId,
        resolved: currentFilters.resolved === 'all' ? undefined : currentFilters.resolved
      });

      // Reshape for UI
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

  // Initial devices load
  useEffect(() => {
    deviceApi.list().then(setDevices).catch(console.error);
  }, []);

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 30000); // Auto-refresh every 30s
    return () => clearInterval(timer);
  }, [loadAlerts]);

  useEffect(() => {
    // 1. Handle single alert highlight via Hash
    if (location.hash && location.hash.startsWith('#alert-')) {
      const id = location.hash.replace('#alert-', '');
      setHighlightedId(id);
      setTimeout(() => setHighlightedId(null), 3000);
    }

    // 2. Handle "Active Issues" highlight via query param
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
      // Refresh list after resolve
      await loadAlerts();
    } catch (err) {
      alert(err.message || "Failed to resolve alert");
    }
    setResolving(null);
  };

  return (
    <div className="alerts-page">
      <h3 className="alerts-title">Notifications</h3>

      <div className="card alerts-filter-card">
        <div className="filters">
          <div className="form-group">
            <label>Device</label>
            <select value={currentFilters.deviceId} onChange={handleFilterChange('device_id')}>
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
            <select value={currentFilters.resolved} onChange={handleFilterChange('resolved')}>
              <option value="all">All</option>
              <option value="false">Active</option>
              <option value="true">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card alerts-table-card">
        {loading ? (
          <div className="empty-state"><p>Loading alerts...</p></div>
        ) : alerts.length === 0 ? (
          <div className="empty-state"><p>No alerts match filters.</p></div>
        ) : (
          <div className="table-wrap alerts-table-wrap">
            <table className="alerts-table">
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
                {alerts.map((a) => {
                  const isLatestForCategory = latestCategoryAlerts.has(a.id);
                  const isHighlighted = a.id === highlightedId || (highlightedActive && isLatestForCategory);
                  return (
                    <tr key={a.id} id={`alert-${a.id}`} className={isHighlighted ? 'highlighted-row' : ''}>
                    <td>
                      <span className={`alert-type-chip ${a.resolved ? 'resolved' : 'unresolved'}`}>
                        {a.type}
                      </span>
                    </td>
                    <td>{a.message}</td>
                    <td>{a.value}</td>
                    <td>{a.deviceId} {a.tankName ? `(${a.tankName})` : ''}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                    <td>
                      {a.resolved
                        ? <span className="alert-status-chip resolved">Resolved</span>
                        : <span className="alert-status-chip active">Active</span>}
                    </td>
                    <td>
                      {!a.resolved && (
                        <button
                          className="alerts-resolve-btn"
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
  );
}
