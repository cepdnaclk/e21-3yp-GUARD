import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deviceApi } from '../services/api';
import '../styles/devices.css';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    deviceId: '',
    deviceName: '',
    temperature: '',
    ph: '',
    turbidity: '',
    waterLevel: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadDevices = async () => {
    try {
      setDevices(await deviceApi.list());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadDevices(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { deviceId: parseInt(form.deviceId, 10) };
      if (form.deviceName) body.deviceName = form.deviceName;
      if (form.temperature !== '') body.temperature = parseFloat(form.temperature);
      if (form.ph !== '') body.ph = parseFloat(form.ph);
      if (form.turbidity !== '') body.turbidity = parseFloat(form.turbidity);
      if (form.waterLevel !== '') body.waterLevel = parseFloat(form.waterLevel);
      await deviceApi.create(body);
      setForm({
        deviceId: '',
        deviceName: '',
        temperature: '',
        ph: '',
        turbidity: '',
        waterLevel: '',
      });
      setShowForm(false);
      await loadDevices();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="empty-state"><p>Loading devices...</p></div>;

  return (
    <>
      <div className="devices-header">
        <h3>Devices ({devices.length})</h3>
      </div>
      <div className="devices-actions">
        {showForm ? (
          <button className="btn btn-primary" onClick={() => setShowForm(false)}>
            Cancel
          </button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Add Device
            </button>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Edit Device
            </button>
          </>
        )}
      </div>

      {showForm && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Register New Device</h3>
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleAdd} className="devices-form">
            <div className="form-group devices-form-device-id">
              <label>Device ID (ESP32) *</label>
              <input type="number" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} required min="1" />
            </div>
            <div className="form-group devices-form-device-name">
              <label>Device Name</label>
              <input type="text" value={form.deviceName} onChange={(e) => setForm({ ...form, deviceName: e.target.value })} placeholder="My Pond Sensor" />
            </div>
            <div className="form-group devices-form-device-id">
              <label>Temperature</label>
              <input type="number" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} step="0.01" placeholder="e.g. 26.5" />
            </div>
            <div className="form-group devices-form-device-id">
              <label>PH</label>
              <input type="number" value={form.ph} onChange={(e) => setForm({ ...form, ph: e.target.value })} step="0.01" placeholder="e.g. 7.2" />
            </div>
            <div className="form-group devices-form-device-id">
              <label>Turbidity</label>
              <input type="number" value={form.turbidity} onChange={(e) => setForm({ ...form, turbidity: e.target.value })} step="0.01" placeholder="e.g. 30" />
            </div>
            <div className="form-group devices-form-device-id">
              <label>Water Level</label>
              <input type="number" value={form.waterLevel} onChange={(e) => setForm({ ...form, waterLevel: e.target.value })} step="0.01" placeholder="e.g. 65" />
            </div>
          
            <button type="submit" className="btn btn-primary devices-form-submit" disabled={busy}>
              {busy ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="empty-state"><p>No devices registered. Click "Add Device" to get started.</p></div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Name</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.deviceId}>
                  <td><strong>{d.deviceId}</strong></td>
                  <td>{d.deviceName || '—'}</td>
                  <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/devices/${d.deviceId}`} className="btn btn-outline btn-sm">Details</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
