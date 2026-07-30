import { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { useAuth } from '../../context/AuthContext';
// devices.css migrated to Tailwind below (same as production Devices.jsx)

export default function DevicesDemo() {
  const { demoDevices } = useDemo();
  const { role } = useAuth();
  const canAddDevice = role === 'ADMIN';
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
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
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(false)}>
            Cancel
          </button>
        )}
      </div>

      {/* Demo "Add Device" form — non-functional */}
      {showForm && canAddDevice && (
        <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl p-6 mb-4">
          <h3 className="mt-0 mb-4 font-bold text-text-main dark:text-slate-100">Register New Device</h3>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: 10 }}>
            🎭 Demo mode — form is read-only.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="devices-form">
            <div className="form-group">
              <label>Product Key *</label>
              <input className="form-input" type="text" readOnly defaultValue="XXXX-XXXX-XXXX-XXXX" />
            </div>
            <div className="form-group">
              <label>Device Name</label>
              <input className="form-input" type="text" readOnly defaultValue="My Pond Sensor" />
            </div>
            <button type="submit" className="btn btn-primary" disabled>Add</button>
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
