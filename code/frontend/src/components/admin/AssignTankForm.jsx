import { useState } from 'react';
import { deviceApi } from '../../services/api';

/**
 * Form to assign a tank to a specific worker/user.
 *
 * @param {{ targetUser: { id: string, fullName?: string, username: string }, onSuccess: (message: string) => void, onCancel: () => void }} props
 */
export default function AssignTankForm({ targetUser, onSuccess, onCancel }) {
  const [tankId, setTankId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTankId = tankId.trim();
    if (!cleanTankId) { setError('Tank ID is required.'); return; }

    setBusy(true);
    setError('');
    try {
      await deviceApi.assignUser(cleanTankId, targetUser.id);
      onSuccess(`Tank ${cleanTankId} assigned to ${targetUser.fullName || targetUser.username}.`);
    } catch (err) {
      setError(err.message || 'Failed to assign tank.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card devices-form-card">
      <h3 className="devices-form-title">
        Assign Tank to {targetUser.fullName || targetUser.username}
      </h3>
      {error && <p className="error-msg">{error}</p>}
      <form onSubmit={handleSubmit} className="devices-form">
        <div className="form-group devices-form-device-id">
          <label>Tank ID *</label>
          <input
            type="text"
            value={tankId}
            onChange={(e) => setTankId(e.target.value)}
            required
            placeholder="GUARD-001"
          />
        </div>
        <button type="submit" className="btn btn-primary devices-form-submit" disabled={busy}>
          {busy ? 'Assigning...' : 'Assign'}
        </button>
      </form>
    </div>
  );
}
