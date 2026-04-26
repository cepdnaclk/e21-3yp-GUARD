import { useEffect, useMemo, useState } from 'react';
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

const SERIES = [
  { key: 'temp', label: 'Temperature', color: '#2f63d7', unit: '°C' },
  { key: 'pH', label: 'pH', color: '#14b8a6', unit: '' },
  { key: 'tds', label: 'TDS', color: '#8b5cf6', unit: 'ppm' },
  { key: 'turbidity', label: 'Turbidity', color: '#f59e0b', unit: 'NTU' },
  { key: 'waterLevel', label: 'Water Level', color: '#ef4444', unit: '%' },
];

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatTooltipValue(value, name) {
  if (value === null || value === undefined) return ['N/A', name];
  return [value, name];
}

export default function TankTimeSeriesChart({ deviceId, autoRefreshMs = 30000 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const historyUrl = useMemo(() => `/api/sensors/history/${deviceId}`, [deviceId]);

  useEffect(() => {
    if (!deviceId) return undefined;

    let active = true;
    const controller = new AbortController();

    const loadHistory = async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError('');

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(historyUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const data = await response.json();
        if (!active) return;

        const normalized = Array.isArray(data)
          ? data.map((item) => ({
              ...item,
              timeLabel: formatTime(item.time),
            }))
          : [];

        setRows(normalized);
      } catch (err) {
        if (err.name !== 'AbortError' && active) {
          setError(err.message || 'Failed to load chart data.');
          setRows([]);
        }
      } finally {
        if (active) {
          if (isInitialLoad) {
            setLoading(false);
          } else {
            setRefreshing(false);
          }
        }
      }
    };

    loadHistory(true);

    const timer = autoRefreshMs
      ? setInterval(() => loadHistory(false), autoRefreshMs)
      : null;

    return () => {
      active = false;
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [deviceId, historyUrl, autoRefreshMs]);

  const chartData = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      time: row.timeLabel || formatTime(row.time),
    }));
  }, [rows]);

  return (
    <div className="tank-chart-card card">
      <div className="card-header">
        <h3>Tank Sensor Trends</h3>
        <span className="tank-chart-meta">
          Auto refresh: {Math.round(autoRefreshMs / 1000)}s{refreshing ? ' (updating...)' : ''}
        </span>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading chart data...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <p className="error-msg">{error}</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="empty-state">
          <p>No history available for this tank.</p>
        </div>
      ) : (
        <div className="tank-chart-wrap">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d8e0eb" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#64748b', fontSize: 12 }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                formatter={formatTooltipValue}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend />
              {SERIES.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={`${series.label}${series.unit ? ` (${series.unit})` : ''}`}
                  stroke={series.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
