import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { deviceApi, sensorApi } from '../services/api';
import '../styles/sensor-history.css';

const SENSOR_TYPES = [
  { id: 'temp', sensorName: 'Temperature' },
  { id: 'pH', sensorName: 'pH' },
  { id: 'tds', sensorName: 'TDS' },
  { id: 'turbidity', sensorName: 'Turbidity' },
  { id: 'waterLevel', sensorName: 'Water Level' },
];

const SENSOR_LINE_CONFIG = {
  temp: { key: 'temp', label: 'Temperature', color: '#2563eb' },
  pH: { key: 'pH', label: 'pH', color: '#7c3aed' },
  tds: { key: 'tds', label: 'TDS', color: '#0f766e' },
  turbidity: { key: 'turbidity', label: 'Turbidity', color: '#ea580c' },
  waterLevel: { key: 'waterLevel', label: 'Water Level', color: '#16a34a' },
};

const SENSOR_ID_TO_FIELD = {
  temp: 'temp',
  pH: 'pH',
  tds: 'tds',
  turbidity: 'turbidity',
  waterLevel: 'waterLevel',
};

function formatChartTime(value) {
  if (!value) return '';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return String(value);
  return time.toLocaleString();
}

function transformReadingsToChartData(items) {
  const grouped = new Map();

  items.forEach((reading) => {
    const timeKey = reading.readingTime;
    if (!timeKey) return;

    if (!grouped.has(timeKey)) {
      grouped.set(timeKey, {
        time: timeKey,
        temp: null,
        pH: null,
        tds: null,
        turbidity: null,
        waterLevel: null,
      });
    }

    const row = grouped.get(timeKey);
    const field = SENSOR_ID_TO_FIELD[reading.sensorId];
    if (field) {
      row[field] = Number(reading.value);
    }
  });

  return Array.from(grouped.values()).sort(
    (left, right) => new Date(left.time) - new Date(right.time)
  );
}

function getLineConfig(sensorId) {
  return SENSOR_LINE_CONFIG[sensorId] || null;
}

export default function SensorHistory() {
  const [searchParams] = useSearchParams();
  const initialDeviceId = searchParams.get('device_id') || searchParams.get('deviceId') || '';

  const [devices, setDevices] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchInfo, setFetchInfo] = useState('');
  const [hasFetched, setHasFetched] = useState(false);

  const [filters, setFilters] = useState({
    deviceId: initialDeviceId,
    sensorId: '',
    from: '',
    to: '',
  });

  useEffect(() => {
    Promise.all([deviceApi.list()])
      .then(([devs]) => {
        setDevices(devs);
        setSensorTypes(SENSOR_TYPES);
        if (!initialDeviceId && Array.isArray(devs) && devs.length > 0) {
          setFilters((prev) => ({ ...prev, deviceId: devs[0].deviceId }));
        }
        setFetchError('');
      })
      .catch((err) => {
        setFetchError(err?.message || 'Failed to load devices.');
      });
  }, []);

  // Auto-fetch if device_id in URL
  useEffect(() => {
    if (initialDeviceId) fetchHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async () => {
    if (!filters.deviceId) {
      setFetchError('Please select a device first.');
      setFetchInfo('');
      return;
    }

    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      setFetchError('"From" date must be before "To" date.');
      setFetchInfo('');
      return;
    }

    setLoading(true);
    setFetchError('');
    setFetchInfo('');
    try {
      const params = { deviceId: filters.deviceId };
      if (filters.sensorId) params.sensorId = filters.sensorId;
      // Keep datetime-local values as-is to avoid invalid Date conversion edge cases.
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const fetched = await sensorApi.history(params);
      setReadings(fetched);
      setHasFetched(true);
      setFetchInfo(
        fetched.length > 0
          ? `Loaded ${fetched.length} reading${fetched.length !== 1 ? 's' : ''}.`
          : 'Fetch completed: no readings found for the selected filters.'
      );
    } catch (err) {
      setReadings([]);
      setHasFetched(true);
      setFetchError(err?.message || 'Failed to fetch sensor history.');
    } finally {
      setLoading(false);
    }
  };

  const clearReadings = () => {
    setReadings([]);
    setHasFetched(false);
    setFetchError('');
    setFetchInfo('');
    setShowAnalytics(false);
  };

  const set = (field) => (e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  const chartData = transformReadingsToChartData(readings);
  const selectedLineConfig = filters.sensorId ? getLineConfig(filters.sensorId) : null;
  const displayAnalyticsMessage = showAnalytics && readings.length === 0;

  return (
    <>
      <h3 className="sensor-history-title">Sensor History</h3>

      <div className="card">
        {fetchError ? <p className="error-msg">{fetchError}</p> : null}
        {fetchInfo ? <p className="sensor-history-summary">{fetchInfo}</p> : null}
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
          <button className="btn btn-primary action-pill-btn" onClick={fetchHistory} type="button">
            {loading ? 'Loading...' : 'Fetch'}
          </button>
          <button
            className="btn btn-primary action-pill-btn"
            onClick={clearReadings}
            type="button"
            disabled={readings.length === 0 && !hasFetched}
          >
            Clear Readings
          </button>
          <button
            className="btn btn-primary action-pill-btn"
            onClick={() => setShowAnalytics((value) => !value)}
            disabled={!filters.deviceId}
            type="button"
          >
            Analytics
          </button>
        </div>
      </div>

      <div className="card">
        {showAnalytics && readings.length > 0 && (
          <div>
            <h4 className="sensor-history-chart-title">Analytics</h4>
            <div className="sensor-chart-wrap">
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatChartTime}
                    minTickGap={24}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={formatChartTime} />
                  <Legend />
                  {filters.sensorId ? (
                    selectedLineConfig ? (
                      <Line
                        type="monotone"
                        dataKey={selectedLineConfig.key}
                        name={selectedLineConfig.label}
                        stroke={selectedLineConfig.color}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ) : null
                  ) : (
                    SENSOR_TYPES.map((sensor) => {
                      const config = getLineConfig(sensor.id);
                      if (!config) return null;

                      return (
                        <Line
                          key={config.key}
                          type="monotone"
                          dataKey={config.key}
                          name={config.label}
                          stroke={config.color}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      );
                    })
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {displayAnalyticsMessage && (
          <p className="sensor-history-summary sensor-history-empty-note">
            No data available for analytics
          </p>
        )}

        {readings.length === 0 ? (
          <div className="empty-state"><p>{hasFetched ? 'No readings found for the selected filters.' : 'Select a device and click Fetch.'}</p></div>
        ) : (
          <>
            <p className="sensor-history-summary">
              Showing {readings.length} reading{readings.length !== 1 ? 's' : ''}
            </p>
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
