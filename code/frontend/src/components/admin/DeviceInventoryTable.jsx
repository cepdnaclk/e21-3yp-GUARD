import { useState } from 'react';
import { deviceApi } from '../../services/api';

/**
 * Device inventory table for SUPER_ADMIN.
 *
 * @param {{ inventory: Array, loading: boolean, onRefresh: () => void }} props
 */
export default function DeviceInventoryTable({ inventory, loading, onRefresh }) {
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="empty-state"><p>Loading inventory...</p></div>;
  if (inventory.length === 0) return <div className="empty-state"><p>No devices in inventory. Use "Add Device" to add one.</p></div>;

  const handleDelete = async (device) => {
    if (!window.confirm(`Delete device ${device.deviceId}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deviceApi.deleteTank(device.deviceId);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to delete device.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="table-wrap card">
      <table>
        <thead>
          <tr>
            <th>Tank ID</th>
            <th>Product Key</th>
            <th>Status</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((device) => (
            <tr key={device.deviceId}>
              <td><strong>{device.deviceId}</strong></td>
              <td><code className="product-key-display">{device.productKey || '—'}</code></td>
              <td>
                <span className={`badge ${device.isRegistered ? 'badge-success' : 'badge-info'}`}>
                  {device.isRegistered ? 'Registered' : 'Unregistered'}
                </span>
              </td>
              <td>{device.createdAt ? new Date(device.createdAt).toLocaleDateString() : '—'}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-outline btn-sm btn-danger"
                  disabled={busy}
                  onClick={() => handleDelete(device)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
