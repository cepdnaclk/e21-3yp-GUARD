import { useState } from 'react';
import { deviceApi } from '../../services/api';
import { formatProductKey } from '../../utils/formatUtils';

/**
 * SUPER_ADMIN form for adding a new device to the inventory.
 *
 * @param {{ onSuccess: () => void, onCancel: () => void }} props
 */
export default function AddDeviceForm({ onSuccess, onCancel }) {
  const [tankId, setTankId] = useState('');
  const [productKey, setProductKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const rawKey = productKey.replace(/-/g, '');
    if (rawKey.length !== 16) {
      setError('Product Key must be exactly 16 characters.');
      return;
    }
    if (!tankId.trim()) {
      setError('Tank ID is required.');
      return;
    }

    setBusy(true);
    try {
      const result = await deviceApi.addProduct(tankId.trim(), rawKey);
      setSuccess(result.message || 'Device added to inventory successfully.');
      setTankId('');
      setProductKey('');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to add device.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card devices-form-card">
      <h3 className="devices-form-title">Add New Device to Inventory</h3>
      <p className="add-device-hint">
        This creates a new device record with no owner. An Admin can claim it by entering the product key from their dashboard.
      </p>
      {error && <p className="error-msg">{error}</p>}
      {success && <p className="profile-success-msg">{success}</p>}
      <form onSubmit={handleSubmit} className="devices-form">
        <div className="form-group devices-form-device-id">
          <label>Tank ID (Device ID) *</label>
          <input
            type="text"
            value={tankId}
            onChange={(e) => setTankId(e.target.value.toUpperCase())}
            required
            placeholder="GUARD-201"
          />
        </div>
        <div className="form-group devices-form-device-name">
          <label>Product Key *</label>
          <input
            type="text"
            value={productKey}
            onChange={(e) => setProductKey(formatProductKey(e.target.value))}
            required
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxLength={19}
          />
        </div>
        <button type="submit" className="btn btn-primary devices-form-submit" disabled={busy}>
          {busy ? 'Adding...' : 'Add to Inventory'}
        </button>
      </form>
    </div>
  );
}
