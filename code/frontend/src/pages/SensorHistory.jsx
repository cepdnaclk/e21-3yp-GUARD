import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deviceApi, sensorTypeApi, sensorApi } from '../services/api';
import HistoricalLineChart from '../components/HistoricalLineChart';

const CHART_COLORS = ['#0ea5e9', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6'];

export default function SensorHistory() {
  const [searchParams] = useSearchParams();
  const initialDeviceId = searchParams.get('device_id') || '';

  const [devices, setDevices] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    deviceId: initialDeviceId,
    sensorId: '',
    from: '',
    to: '',
  });

  const groupedReadings = readings.reduce((acc, reading) => {
    const key = reading.sensorType?.sensorName || `sensor_${reading.sensorId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(reading);
    return acc;
  }, {});

  const chartData = Object.entries(groupedReadings)
    .map(([sensorName, items]) => ({
      sensorName,
      points: items
        .slice()
        .sort((a, b) => new Date(a.readingTime) - new Date(b.readingTime))
        .map((r) => ({ value: Number(r.value), readingTime: r.readingTime })),
    }))
    .sort((a, b) => a.sensorName.localeCompare(b.sensorName));

  useEffect(() => {
    Promise.all([deviceApi.list(), sensorTypeApi.list()])
      .then(([devs, types]) => { setDevices(devs); setSensorTypes(types); })
      .catch(() => {});
  }, []);

  // Auto-fetch if device_id in URL
  useEffect(() => {
    if (initialDeviceId) fetchHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async () => {
    if (!filters.deviceId) return;
    setLoading(true);
    try {
      const params = { deviceId: filters.deviceId };
      if (filters.sensorId) params.sensorId = filters.sensorId;
      if (filters.from) params.from = new Date(filters.from).toISOString();
      if (filters.to) params.to = new Date(filters.to).toISOString();
      setReadings(await sensorApi.history(params));
    } catch { setReadings([]); }
    setLoading(false);
  };

  const set = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });

  return (
    <>
      <h3 style={{ marginBottom: '1rem' }}>Sensor History</h3>

      <div className="card">
        <div className="filters">
          <div className="form-group">
            <label>Device *</label>
            <select value={filters.deviceId} onChange={set('deviceId')} required>
              <option value="">Select device</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId} — {d.deviceName || 'Unnamed'}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Sensor Type</label>
            <select value={filters.sensorId} onChange={set('sensorId')}>
              <option value="">All sensors</option>
              {sensorTypes.map((s) => (
                <option key={s.id} value={s.id}>{s.sensorName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>From</label>
            <input type="datetime-local" value={filters.from} onChange={set('from')} />
          </div>
          <div className="form-group">
            <label>To</label>
            <input type="datetime-local" value={filters.to} onChange={set('to')} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={fetchHistory} disabled={!filters.deviceId || loading}>
            {loading ? 'Loading...' : 'Fetch'}
          </button>
        </div>
      </div>

      <div className="card">
        {readings.length === 0 ? (
          <div className="empty-state"><p>No readings found. Select a device and click Fetch.</p></div>
        ) : (
          <>
            <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Showing {readings.length} reading{readings.length !== 1 ? 's' : ''}
            </p>

            <div className="history-chart-grid">
              {chartData.map((series, idx) => (
                <HistoricalLineChart
                  key={series.sensorName}
                  title={`${series.sensorName} variation over time`}
                  points={series.points}
                  color={CHART_COLORS[idx % CHART_COLORS.length]}
                />
              ))}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sensor</th>
                    <th>Value</th>
                    <th>Reading Time</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.sensorType?.sensorName || r.sensorId}</td>
                      <td><strong>{r.value}</strong></td>
                      <td>{new Date(r.readingTime).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
