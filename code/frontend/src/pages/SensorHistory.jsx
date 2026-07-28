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
import { SENSOR_TYPES, SENSOR_LINE_CONFIG, SENSOR_ID_TO_FIELD } from '../constants/sensorConstants';
import { formatChartTime } from '../utils/formatUtils';
import GlassDatePicker from '../components/DatePicker';
// sensor-history.css migrated to Tailwind below

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
    deviceApi.list()
      .then((devs) => {
        setDevices(devs);
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

  const downloadReport = () => {
    if (readings.length === 0) return;

    const headers = ['#', 'Sensor', 'Value', 'Reading Time'];
    const csvRows = readings.map((r, i) => [
      i + 1,
      `"${r.sensorType?.sensorName || r.sensorId}"`,
      r.value,
      `"${new Date(r.readingTime).toLocaleString()}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sensor_report_${filters.deviceId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const set = (field) => (e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  const chartData = transformReadingsToChartData(readings);
  const selectedLineConfig = filters.sensorId ? getLineConfig(filters.sensorId) : null;
  const displayAnalyticsMessage = showAnalytics && readings.length === 0;

  return (
    <>
      {/* .sensor-history-title */}
      <h1 className="text-[1.6rem] font-bold tracking-tight text-text-main dark:text-[#e6edf3] mb-5">Sensor History</h1>

      <div className="card">
        {fetchError ? <p className="error-msg">{fetchError}</p> : null}
        {/* .sensor-history-summary */}
        {fetchInfo ? <p className="text-text-muted text-base mb-3">{fetchInfo}</p> : null}
        <div className="filters">
          <div className="form-group">
            <label>Device *</label>
            <select className='form-input' value={filters.deviceId} onChange={set('deviceId')} required>
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
            <select className='form-input' value={filters.sensorId} onChange={set('sensorId')}>
              <option value="">All sensors</option>
              {SENSOR_TYPES.map((s) => (
                <option key={s.id} value={s.id}>{s.sensorName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>From</label>
            <GlassDatePicker
              id="sensor-history-from"
              label="From date & time"
              value={filters.from}
              onChange={(v) => setFilters((prev) => ({ ...prev, from: v }))}
            />
          </div>
          <div className="form-group">
            <label>To</label>
            <GlassDatePicker
              id="sensor-history-to"
              label="To date & time"
              value={filters.to}
              onChange={(v) => setFilters((prev) => ({ ...prev, to: v }))}
            />
          </div>
        </div>

        <div className="filter-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn action-btn" onClick={fetchHistory} type="button">
            {loading ? 'Loading...' : 'Fetch'}
          </button>
          <button
            className="btn action-btn"
            onClick={clearReadings}
            type="button"
            disabled={readings.length === 0 && !hasFetched}
          >
            Clear Readings
          </button>
          <button
            className="btn action-btn"
            onClick={() => setShowAnalytics((value) => !value)}
            disabled={!filters.deviceId}
            type="button"
          >
            Analytics
          </button>
          <button
            className="btn action-btn"
            onClick={downloadReport}
            disabled={readings.length === 0}
            type="button"
          >
            Download Report
          </button>
        </div>
      </div>

      <div className="card">
        {showAnalytics && readings.length > 0 && (
          <div>
            {/* .sensor-history-chart-title */}
            <h4 className="mb-4 text-[1.1rem] font-bold text-text-main dark:text-slate-200">Analytics</h4>
            {/* .sensor-chart-wrap */}
            <div className="w-full min-h-[360px] overflow-x-auto p-4">
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatChartTime}
                    minTickGap={24}
                    tick={{ fill: '#334155', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={formatChartTime}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    labelStyle={{
                      color: '#0f172a',
                      fontWeight: '700',
                      marginBottom: '8px',
                      display: 'block',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: '4px'
                    }}
                    itemStyle={{
                      padding: '2px 0',
                      fontWeight: '500'
                    }}
                  />
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
          <p className="mt-3 text-center p-8 bg-white/[0.04] border border-white/10 rounded-xl text-text-muted">
            No data available for analytics
          </p>
        )}

        {readings.length === 0 ? (
          <div className="empty-state"><p>{hasFetched ? 'No readings found for the selected filters.' : 'Select a device and click Fetch.'}</p></div>
        ) : (
          <>
            {/* .sensor-history-summary */}
            <p className="text-text-muted text-base mb-3">
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
