import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deviceApi, sensorApi } from '../services/api';
import TankTimeSeriesChart from '../components/TankTimeSeriesChart';
import '../styles/device-detail.css';

const SENSOR_UNITS = {
  'temperature': '°C',
  ph: '',
  turbidity: 'NTU',
  'water level': '%',
  waterlevel: '%',
  tds: 'ppm',
};

function buildLocalAlerts(device, readings) {
  const nextAlerts = [];

  if (!device) return nextAlerts;

  if (device.status !== 'online') {
    nextAlerts.push({
      id: `${device.deviceId}-offline`,
      type: 'Status',
      message: 'Device appears offline.',
      value: device.status,
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  }

  if (!Array.isArray(readings) || readings.length === 0) {
    nextAlerts.push({
      id: `${device.deviceId}-no-readings`,
      type: 'Data',
      message: 'No sensor readings received yet.',
      value: '-',
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  }

  return nextAlerts;
}

export default function DeviceDetail() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [dev, latest] = await Promise.all([
          deviceApi.get(id),
          sensorApi.latest(id),
        ]);
        setDevice(dev);
        setReadings(latest);
        setAlerts(buildLocalAlerts(dev, latest));
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="empty-state"><p>Loading device...</p></div>;
  if (error) return <div className="empty-state"><p className="error-msg">{error}</p></div>;

  return (
    <>
      <div className="device-detail-header">
        <div>
          <h3>Device #{device.deviceId}</h3>
          <p className="device-detail-name">
            {device.deviceName || 'Unnamed'}
          </p>
        </div>
        <Link to="/devices" className="btn btn-outline btn-sm">Back to Devices</Link>
      </div>

      {/* Latest Sensor Readings */}
      <div className="card">
        <div className="card-header">
          <h3>Latest Readings</h3>
          <Link to={`/sensors/history?device_id=${id}`} className="btn btn-outline btn-sm">View History</Link>
        </div>
        {readings.length === 0 ? (
          <div className="empty-state"><p>No sensor data received yet.</p></div>
        ) : (
          <div className="sensor-grid">
            {readings.map((r) => {
              const name = r.sensorType?.sensorName || `Sensor ${r.sensorId}`;
              const unit = SENSOR_UNITS[name.toLowerCase()] ?? '';
              return (
                <div className="sensor-card" key={r.id}>
                  <div className="sensor-name">{name}</div>
                  <div className="sensor-value">
                    {typeof r.value === 'number' ? r.value.toFixed(1) : r.value}{unit}
                  </div>
                  <div className="sensor-time">{new Date(r.readingTime).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Time Series Chart */}
      <TankTimeSeriesChart deviceId={id} />

      {/* Device Alerts */}
      {alerts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Active Alerts ({alerts.length})</h3>
            <Link to="/alerts" className="btn btn-outline btn-sm">View All Alerts</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Message</th><th>Value</th><th>Time</th></tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td><span className="badge badge-danger">{a.type}</span></td>
                    <td>{a.message}</td>
                    <td>{a.value}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
