import { useState, useEffect, useMemo } from 'react';
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
import { SENSOR_TYPES, SENSOR_LINE_CONFIG, SENSOR_ID_TO_FIELD, getSensorLineColor } from '../constants/sensorConstants';
import { formatChartTime } from '../utils/formatUtils';
import { useTheme } from '../context/ThemeContext';
import GlassDatePicker from '../components/DatePicker';

function transformReadingsToChartData(items, isAllSensors = false) {
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
      let numVal = Number(reading.value);
      if (isAllSensors && field === 'turbidity' && !Number.isNaN(numVal)) {
        numVal = Number((numVal / 100).toFixed(2));
      }
      row[field] = numVal;
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchParams] = useSearchParams();
  const urlDeviceId = searchParams.get('device_id') || searchParams.get('deviceId') || searchParams.get('id') || '';
  const urlFrom = searchParams.get('from') || '';
  const urlTo = searchParams.get('to') || '';

  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [fetchInfo, setFetchInfo] = useState('');
  const [hasFetched, setHasFetched] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (Newest first) or 'asc' (Oldest first)

  const [filters, setFilters] = useState({
    deviceId: urlDeviceId,
    sensorId: '',
    from: urlFrom,
    to: urlTo,
  });

  // Keep filters in sync with URL parameters
  useEffect(() => {
    if (urlDeviceId || urlFrom || urlTo) {
      setFilters((prev) => ({
        ...prev,
        ...(urlDeviceId ? { deviceId: urlDeviceId } : {}),
        ...(urlFrom ? { from: urlFrom } : {}),
        ...(urlTo ? { to: urlTo } : {}),
      }));
    }
  }, [urlDeviceId, urlFrom, urlTo]);

  // Load device list from backend
  useEffect(() => {
    deviceApi.list()
      .then((devs) => {
        setDevices(devs);
        setFetchError('');
        // If no device_id in URL and no device selected yet, default to first device
        if (!urlDeviceId && Array.isArray(devs) && devs.length > 0) {
          setFilters((prev) => (prev.deviceId ? prev : { ...prev, deviceId: devs[0].deviceId }));
        }
      })
      .catch((err) => {
        setFetchError(err?.message || 'Failed to load devices.');
      });
  }, [urlDeviceId]);

  const fetchHistoryFor = async (targetDeviceId = filters.deviceId, sensorId = filters.sensorId, from = filters.from, to = filters.to) => {
    if (!targetDeviceId) {
      setFetchError('Please select a device first.');
      setFetchInfo('');
      return;
    }

    if (from && to && new Date(from) > new Date(to)) {
      setFetchError('"From" date must be before "To" date.');
      setFetchInfo('');
      return;
    }

    setLoading(true);
    setFetchError('');
    setFetchInfo('');
    try {
      const params = { deviceId: targetDeviceId };
      if (sensorId) params.sensorId = sensorId;
      if (from) params.from = from;
      if (to) params.to = to;
      const fetched = await sensorApi.history(params);
      setReadings(fetched);
      setHasFetched(true);
      setShowGraph(true);

      const dateRangeStr = (from || to)
        ? ` (Range: ${from ? `From ${new Date(from).toLocaleString()}` : ''}${from && to ? ' — ' : ''}${to ? `To ${new Date(to).toLocaleString()}` : ''})`
        : '';

      setFetchInfo(
        fetched.length > 0
          ? `Loaded ${fetched.length} reading${fetched.length !== 1 ? 's' : ''} for device ${targetDeviceId}${dateRangeStr}.`
          : `Fetch completed: no readings found for device ${targetDeviceId}${dateRangeStr}.`
      );
    } catch (err) {
      setReadings([]);
      setHasFetched(true);
      setFetchError(err?.message || 'Failed to fetch sensor history.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = () => fetchHistoryFor(filters.deviceId, filters.sensorId, filters.from, filters.to);

  // Auto-fetch whenever device_id URL parameter is present or changes
  useEffect(() => {
    const target = urlDeviceId || filters.deviceId;
    if (target) {
      fetchHistoryFor(target, filters.sensorId, filters.from, filters.to);
    }
  }, [urlDeviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sort fetched readings by readingTime ascending or descending
  const sortedReadings = useMemo(() => {
    return [...readings].sort((a, b) => {
      const timeA = new Date(a.readingTime).getTime();
      const timeB = new Date(b.readingTime).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [readings, sortOrder]);

  const clearReadings = () => {
    setReadings([]);
    setHasFetched(false);
    setShowGraph(false);
    setFetchError('');
    setFetchInfo('');
  };

  const downloadReport = () => {
    if (sortedReadings.length === 0) return;

    const headers = ['#', 'Sensor', 'Value', 'Reading Time'];
    const csvRows = sortedReadings.map((r, i) => [
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
  const isAllSensors = !filters.sensorId;
  const chartData = useMemo(() => transformReadingsToChartData(readings, isAllSensors), [readings, isAllSensors]);
  const selectedLineConfig = filters.sensorId ? getLineConfig(filters.sensorId) : null;

  return (
    <>
      <div className="card" id="analytics-card">
        {fetchError ? <p className="error-msg">{fetchError}</p> : null}
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
          <div className="form-group">
            <label>Sort By Time</label>
            <select className='form-input' value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Newest First (Descending ⬇️)</option>
              <option value="asc">Oldest First (Ascending ⬆️)</option>
            </select>
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
            onClick={downloadReport}
            disabled={readings.length === 0}
            type="button"
          >
            Download Report
          </button>
          <button
            className="btn action-btn"
            onClick={() => setShowGraph((prev) => !prev)}
            disabled={readings.length === 0}
            type="button"
          >
            {showGraph ? 'Hide Graph' : 'Show Graph'}
          </button>
        </div>
      </div>

      {showGraph && readings.length > 0 && (
        <div className="card mb-6">
          <h4 className="mb-4 text-[1.1rem] font-bold text-text-main dark:text-slate-200">
            Sensor History Analytics Graph ({filters.sensorId ? (selectedLineConfig?.label || filters.sensorId) : 'All Sensors'})
          </h4>
          <div className="w-full min-h-[360px] overflow-x-auto p-2">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatChartTime}
                  minTickGap={24}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  reversed={filters.sensorId === 'waterLevel'}
                  domain={filters.sensorId === 'waterLevel' ? [0, 200] : ['auto', 'auto']}
                  tickFormatter={(val) => (filters.sensorId === 'waterLevel' ? `${val} cm` : val)}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
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
                      name={`${selectedLineConfig.label}${selectedLineConfig.unit ? ` (${selectedLineConfig.unit})` : ''}`}
                      stroke={getSensorLineColor(selectedLineConfig.key, isDark)}
                      strokeWidth={2.5}
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
                        name={config.key === 'turbidity' ? 'Turbidity (NTU ÷ 100)' : `${config.label}${config.unit ? ` (${config.unit})` : ''}`}
                        stroke={getSensorLineColor(config.key, isDark)}
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

      <div className="card">
        {sortedReadings.length === 0 ? (
          <div className="empty-state">
            <p>{hasFetched ? 'No readings found for the selected filters.' : 'Select a device and click Fetch.'}</p>
          </div>
        ) : (
          <>
            <p className="text-text-muted text-base mb-3 font-medium flex flex-wrap items-center gap-2">
              <span>Showing {sortedReadings.length} reading{sortedReadings.length !== 1 ? 's' : ''}</span>
              {(filters.from || filters.to) && (
                <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-semibold border border-sky-500/20">
                  📅 {filters.from ? `From ${new Date(filters.from).toLocaleString()}` : ''} {filters.from && filters.to ? '— ' : ''}{filters.to ? `To ${new Date(filters.to).toLocaleString()}` : ''}
                </span>
              )}
              <span className="text-xs text-slate-500">(Sorted by time {sortOrder === 'desc' ? '⬇️ Newest first' : '⬆️ Oldest first'})</span>
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sensor</th>
                    <th>Value</th>
                    <th 
                      onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="cursor-pointer hover:text-sky-400 transition-colors select-none"
                      title="Click to toggle time sort order"
                    >
                      Reading Time {sortOrder === 'desc' ? '⬇️' : '⬆️'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReadings.map((r, i) => (
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
