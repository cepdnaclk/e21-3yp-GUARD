import { useState, useMemo } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useDemo } from '../../context/DemoContext';
import { useTheme } from '../../context/ThemeContext';
import { SENSOR_TYPES, SENSOR_LINE_CONFIG, SENSOR_ID_TO_FIELD, getSensorLineColor } from '../../constants/sensorConstants';
import { formatChartTime } from '../../utils/formatUtils';
// sensor-history.css migrated to Tailwind (SensorHistory.jsx)

function transformReadingsToChartData(items) {
  const grouped = new Map();
  items.forEach((reading) => {
    const timeKey = reading.readingTime;
    if (!timeKey) return;
    if (!grouped.has(timeKey)) {
      grouped.set(timeKey, { time: timeKey, temp: null, pH: null, tds: null, turbidity: null, waterLevel: null });
    }
    const row = grouped.get(timeKey);
    const field = SENSOR_ID_TO_FIELD[reading.sensorId] || reading.sensorId;
    if (field) row[field] = Number(reading.value);
  });
  return Array.from(grouped.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
}

export default function SensorHistoryDemo() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { demoDevices, demoSensorHistory } = useDemo();
  const [selectedDevice, setSelectedDevice] = useState(demoDevices[0]?.deviceId || '');
  const [selectedSensors, setSelectedSensors] = useState(['temp', 'pH']);

  const rawReadings = useMemo(() => {
    return demoSensorHistory[selectedDevice] || [];
  }, [selectedDevice, demoSensorHistory]);

  const chartData = useMemo(() => transformReadingsToChartData(rawReadings), [rawReadings]);

  const toggleSensor = (id) => {
    setSelectedSensors(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div id="analytics-page" style={{ padding: '1rem 0' }}>
      <div className="card" id="analytics-card" style={{ padding: '1.2rem', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label>Device</label>
            <select
              className="form-input"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              {demoDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId} — {d.deviceName || 'Unnamed'}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Sensors</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 4 }}>
              {SENSOR_TYPES.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedSensors.includes(s.id)}
                    onChange={() => toggleSensor(s.id)}
                  />
                  {s.sensorName}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.2rem' }}>
        {chartData.length === 0 ? (
          <div className="empty-state"><p>No data for selected device.</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="time" tickFormatter={formatChartTime} tick={{ fontSize: 11 }} />
              <YAxis
                reversed={selectedSensors.length === 1 && selectedSensors[0] === 'waterLevel'}
                tick={{ fontSize: 11 }}
              />
              <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} />
              <Legend />
              {selectedSensors.map(sId => {
                const cfg = SENSOR_LINE_CONFIG[sId];
                if (!cfg) return null;
                return (
                  <Line
                    key={sId}
                    type="monotone"
                    dataKey={cfg.key}
                    name={`${cfg.label}${cfg.unit ? ` (${cfg.unit})` : ''}`}
                    stroke={getSensorLineColor(cfg.key, isDark)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
