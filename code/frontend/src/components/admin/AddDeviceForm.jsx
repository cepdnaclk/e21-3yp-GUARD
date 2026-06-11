import { useState } from 'react';
import { deviceApi } from '../../services/api';
import { formatProductKey } from '../../utils/formatUtils';
import '../../styles/CreateAccountForm.css';

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

  const generateProductKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setProductKey(formatProductKey(key));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const rawKey = productKey.replace(/-/g, '');
    if (rawKey.length !== 16) {
      setError('Please generate a Product Key.');
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 160px' }}>
          <label>Tank ID (Device ID) *</label>
          <input 
            className="form-input"
            type="text"
            value={tankId}
            onChange={(e) => setTankId(e.target.value.toUpperCase())}
            required
            placeholder="GUARD-201"
            style={{ width: '100%', margin: 0, height: '42px' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, flex: '2 1 280px' }}>
          <label>Product Key *</label>
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <input 
              className="form-input"
              type="text"
              value={productKey}
              readOnly
              required
              placeholder="Click Generate"
              maxLength={19}
              style={{ margin: 0, flex: 1, cursor: 'not-allowed', background: 'rgba(0,0,0,0.05)', height: '42px' }}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={generateProductKey}
              style={{ padding: '0 1.25rem', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', margin: 0 }}
            >
              Generate
            </button>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ height: '42px', margin: 0, whiteSpace: 'nowrap', flex: '0 0 auto' }}>
          {busy ? 'Adding...' : 'Add to Inventory'}
        </button>
      </form>
    </div>
  );
}
