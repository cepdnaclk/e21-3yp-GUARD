import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deviceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/devices.css';

export default function Devices() {
  const { role } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [form, setForm] = useState({
    deviceId: '',
    deviceName: '',
  });
  const [deleteForm, setDeleteForm] = useState({
    deviceId: '',
    deviceName: '',
  });
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);

  const canAddDevice = role === 'ADMIN'; // Only admins can add devices
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

    if (!canAddDevice) {
      setError('Only ADMIN can add devices.');
      return;
    }

    setBusy(true);
    try {
      const body = { deviceId: form.deviceId.trim() };
      if (!body.deviceId) {
        throw new Error('Device ID is required.');
      }

      if (form.deviceName.trim()) {
        body.deviceName = form.deviceName.trim();
      }

      await deviceApi.create(body);
      setForm({
        deviceId: '',
        deviceName: '',
      });
      setShowForm(false);
      await loadDevices();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleteError('');

    if (!canAddDevice) {
      setDeleteError('Only ADMIN can delete devices.');
      return;
    }

    const deviceId = deleteForm.deviceId.trim();
    const deviceName = deleteForm.deviceName.trim();

    if (!deviceId || !deviceName) {
      setDeleteError('Device ID and Device Name are required.');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete device ${deviceId} (${deviceName})?`
    );

    if (!confirmDelete) {
      return;
    }

    setBusy(true);
    try {
      await deviceApi.deleteTank(deviceId, deviceName);
      setDeleteForm({
        deviceId: '',
        deviceName: '',
      });
      setShowDeleteForm(false);
      await loadDevices();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete device.');
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setShowForm(true);
            setShowDeleteForm(false);
            setDeleteError('');
          }}
          disabled={!canAddDevice || busy}
          title={canAddDevice ? 'Add new device' : 'Only ADMIN can add devices'}
        >
          Add Device
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setShowDeleteForm(true);
            setShowForm(false);
            setError('');
          }}
          disabled={!canAddDevice || busy}
          title={canAddDevice ? 'Delete an existing device' : 'Only ADMIN can delete devices'}
        >
          Delete Device
        </button>

        {(showForm || showDeleteForm) ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowForm(false);
              setShowDeleteForm(false);
              setError('');
              setDeleteError('');
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>

      {showForm && canAddDevice && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Register New Device</h3>
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleAdd} className="devices-form">
            <div className="form-group devices-form-device-id">
              <label>Device ID (Tank ID) *</label>
              <input type="text" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} required placeholder="GUARD-001" />
            </div>
            <div className="form-group devices-form-device-name">
              <label>Device Name</label>
              <input type="text" value={form.deviceName} onChange={(e) => setForm({ ...form, deviceName: e.target.value })} placeholder="My Pond Sensor" />
            </div>
          
            <button type="submit" className="btn btn-primary devices-form-submit" disabled={busy}>
              {busy ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>
      )}

      {showDeleteForm && canAddDevice && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Delete Device</h3>
          {deleteError && <p className="error-msg">{deleteError}</p>}
          <form onSubmit={handleDelete} className="devices-form">
            <div className="form-group devices-form-device-id">
              <label>Device ID (Tank ID) *</label>
              <input
                type="text"
                value={deleteForm.deviceId}
                onChange={(e) => setDeleteForm({ ...deleteForm, deviceId: e.target.value })}
                required
                placeholder="GUARD-001"
              />
            </div>
            <div className="form-group devices-form-device-name">
              <label>Device Name *</label>
              <input
                type="text"
                value={deleteForm.deviceName}
                onChange={(e) => setDeleteForm({ ...deleteForm, deviceName: e.target.value })}
                required
                placeholder="Main Tank"
              />
            </div>

            <button type="submit" className="btn btn-primary devices-form-submit" disabled={busy}>
              {busy ? 'Deleting...' : 'Delete'}
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
                <th>User Assigned</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.deviceId}>
                  <td><strong>{d.deviceId}</strong></td>
                  <td>{d.deviceName || '—'}</td>
                  <td>{Array.isArray(d.workers) && d.workers.length > 0 ? d.workers.map(w => w.fullName || w.username).join(', ') : '—'}</td>
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
