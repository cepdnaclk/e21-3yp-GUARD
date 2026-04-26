import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deviceApi, sensorTypeApi, sensorApi } from '../services/api';
import '../styles/sensor-history.css';

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
      <h3 className="sensor-history-title">Sensor History</h3>

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
