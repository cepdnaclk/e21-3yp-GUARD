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
import { sensorApi } from '../services/api';
import { SENSOR_LINE_CONFIG } from '../constants/sensorConstants';

const SERIES = Object.values(SENSOR_LINE_CONFIG);

function formatFullTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

function formatTooltipValue(value, name) {
  if (value === null || value === undefined) return ['N/A', name];
  return [value, name];
}

export default function TankTimeSeriesChart({ deviceId, autoRefreshMs = 30000, isOnline = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!deviceId) return undefined;

    let active = true;

    const loadHistory = async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError('');

      try {
        const data = await sensorApi.chartHistory(deviceId);
        if (!active) return;
        setRows(data);
      } catch (err) {
        if (active) {
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
      if (timer) clearInterval(timer);
    };
  }, [deviceId, autoRefreshMs]);

  const chartData = useMemo(() => {
    let lastDateStr = null;
    return rows.map((row, index) => {
      const d = new Date(row.time);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      let displayTime = timeStr;
      if (index === 0 || dateStr !== lastDateStr) {
        displayTime = `${dateStr} ${timeStr}`;
        lastDateStr = dateStr;
      }

      return {
        ...row,
        displayTime,
        fullTime: formatFullTime(row.time),
      };
    });
  }, [rows]);

  return (
    <div className="tank-chart-card card">
      <div className="card-header">
        <h3>Tank Sensor Trends</h3>
        <span className="tank-chart-meta">
          {isOnline ? (
            <span className="badge badge-success">Online</span>
          ) : (
            <span className="badge badge-danger">Disconnected</span>
          )}
          &nbsp; Auto refresh: {Math.round(autoRefreshMs / 1000)}s{refreshing ? ' (updating...)' : ''}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(45%, 1fr))', gap: '1.5rem', padding: '1rem' }}>
          {SERIES.map((series) => (
             <div key={series.key} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
               <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: '#334155' }}>
                 {series.label}
               </h4>
               <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d8e0eb" />
                      <XAxis
                        dataKey="displayTime"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        angle={-30}
                        textAnchor="end"
                        height={70}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip
                        formatter={formatTooltipValue}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return `Time: ${payload[0].payload.fullTime}`;
                          }
                          return `Time: ${label}`;
                        }}
                      />
                      <Legend />
                      <Line
                         type="monotone"
                         dataKey={series.key}
                         name={`${series.label}${series.unit ? ` (${series.unit})` : ''}`}
                         stroke={series.color}
                         strokeWidth={2}
                         dot={false}
                         connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
