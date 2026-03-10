import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deviceApi } from '../services/api';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ deviceId: '', deviceName: '' });
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
      await deviceApi.create(body);
      setForm({ deviceId: '', deviceName: '' });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Devices ({devices.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Device'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Register New Device</h3>
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group" style={{ flex: '1 1 120px' }}>
              <label>Device ID (ESP32) *</label>
              <input type="number" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} required min="1" />
            </div>
            <div className="form-group" style={{ flex: '1 1 160px' }}>
              <label>Device Name</label>
              <input type="text" value={form.deviceName} onChange={(e) => setForm({ ...form, deviceName: e.target.value })} placeholder="My Pond Sensor" />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy} style={{ height: 'fit-content' }}>
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
