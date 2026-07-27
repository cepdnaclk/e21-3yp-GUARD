import { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { useAuth } from '../../context/AuthContext';
import '../../styles/devices.css';

export default function DevicesDemo() {
  const { demoDevices } = useDemo();
  const { role } = useAuth();
  const canAddDevice = role === 'ADMIN';

  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="devices-header">
        <h3>Devices ({demoDevices.length})</h3>
      </div>

      <div className="devices-actions">
        <button
          id="add-device-btn"
          type="button"
          className="btn action-btn"
          onClick={() => setShowForm(true)}
          disabled={!canAddDevice}
          title={canAddDevice ? 'Add new device' : 'Only ADMIN can add devices'}
        >
          Add Device
        </button>

        <button
          type="button"
          className="btn action-btn"
          disabled={!canAddDevice}
          title={canAddDevice ? 'Delete a device' : 'Only ADMIN can delete devices'}
        >
          Delete Device
        </button>

        {showForm && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Demo "Add Device" form — non-functional */}
      {showForm && canAddDevice && (
        <div className="card devices-form-card">
          <h3 className="devices-form-title">Register New Device</h3>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: 10 }}>
            🎭 Demo mode — form is read-only.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="devices-form">
            <div className="form-group devices-form-device-id">
              <label>Product Key *</label>
              <input className="form-input" type="text" readOnly defaultValue="XXXX-XXXX-XXXX-XXXX" />
            </div>
            <div className="form-group devices-form-device-name">
              <label>Device Name</label>
              <input className="form-input" type="text" readOnly defaultValue="My Pond Sensor" />
            </div>
            <button type="submit" className="btn btn-primary devices-form-submit" disabled>Add</button>
          </form>
        </div>
      )}

      <div className="table-wrap card" id="devices-table">
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
            {demoDevices.map((d) => (
              <tr key={d.deviceId}>
                <td><strong>{d.deviceId}</strong></td>
                <td>{d.deviceName || '—'}</td>
                <td>
                  {Array.isArray(d.workers) && d.workers.length > 0
                    ? d.workers.map(w => w.fullName || w.username).join(', ')
                    : '—'}
                </td>
                <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-outline btn-sm" disabled title="Demo mode">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
