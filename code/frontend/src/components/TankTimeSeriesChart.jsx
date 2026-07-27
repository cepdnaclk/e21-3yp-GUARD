import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { sensorApi } from '../services/api';
import { SENSOR_LINE_CONFIG } from '../constants/sensorConstants';
import { useTheme } from '../context/ThemeContext';

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

function buildSeriesOption(series, chartData, isDark) {
  const textColor = isDark ? '#ffffff' : '#334155';
  const titleColor = isDark ? '#ffffff' : '#0f172a';
  const axisLineColor = isDark ? '#30363d' : '#d8e0eb';
  const tooltipBg = isDark ? '#161b22' : '#ffffff';
  const tooltipBorder = isDark ? '1px solid #30363d' : '1px solid #f1f5f9';

  return {
    grid: { top: 20, right: 24, bottom: 70, left: 50 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderWidth: 0,
      extraCssText: 'border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); padding: 12px;',
      textStyle: { color: textColor },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const point = params[0];
        const raw = chartData[point.dataIndex];
        const title = raw ? raw.fullTime : point.axisValueLabel;
        const value = point.data === null || point.data === undefined ? 'N/A' : point.data;
        const unitSuffix = series.unit ? ' ' + series.unit : '';
        return '<div style="font-weight:700;margin-bottom:8px;border-bottom:' + tooltipBorder + ';padding-bottom:4px;color:' + titleColor + ';">' + title + '</div>' +
          '<div style="padding:2px 0;font-weight:500;color:' + textColor + ';">' + series.label + ': ' + value + unitSuffix + '</div>';
      }
    },
    legend: {
      data: [series.label],
      top: 0,
      textStyle: { color: textColor }
    },
    xAxis: {
      type: 'category',
      data: chartData.map((row) => row.displayTime),
      axisLabel: {
        color: textColor,
        fontSize: 11,
        rotate: 30,
        hideOverlap: true
      },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor, fontSize: 12 },
      splitLine: { lineStyle: { color: axisLineColor, type: 'dashed' } }
    },
    series: [
      {
        name: series.label,
        type: 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: true,
        lineStyle: { color: series.color, width: 2 },
        itemStyle: { color: series.color },
        data: chartData.map((row) => row[series.key] ?? null)
      }
    ]
  };
}

export default function TankTimeSeriesChart({ deviceId, autoRefreshMs = 30000, isOnline = true }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
              <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: isDark ? '#ffffff' : '#334155' }}>
                {series.label}
              </h4>
              <div style={{ width: '100%', height: 300 }}>
                <ReactECharts
                  option={buildSeriesOption(series, chartData, isDark)}
                  style={{ width: '100%', height: '100%' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
