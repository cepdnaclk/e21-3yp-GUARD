import { useState, useEffect } from 'react';
import { deviceApi } from '../../services/api';

/**
 * Form to assign a tank to a specific worker/user.
 *
 * @param {{ targetUser: { id: string, fullName?: string, username: string, assignedTankIds?: string[] }, onSuccess: (message: string) => void, onCancel: () => void }} props
 */
export default function AssignTankForm({ targetUser, onSuccess, onCancel }) {
  const [tanks, setTanks] = useState([]);
  const [loadingTanks, setLoadingTanks] = useState(true);
  const [tankId, setTankId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchTanks = async () => {
      try {
        const list = await deviceApi.list();
        if (active) {
          // Filter out tanks that are already assigned to targetUser
          const assignedIds = targetUser.assignedTankIds || [];
          const available = list.filter(t => !assignedIds.includes(t.id));
          setTanks(available);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load tanks.');
        }
      } finally {
        if (active) {
          setLoadingTanks(false);
        }
      }
    };
    fetchTanks();
    return () => { active = false; };
  }, [targetUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTankId = tankId.trim();
    if (!cleanTankId) { setError('Please select a tank.'); return; }

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
          <label>Select Tank *</label>
          {loadingTanks ? (
            <p style={{ margin: '0.5rem 0', opacity: 0.7 }}>Loading available tanks...</p>
          ) : tanks.length === 0 ? (
            <p style={{ margin: '0.5rem 0', opacity: 0.7 }}>No unassigned tanks found.</p>
          ) : (
            <select
              className="form-input"
              value={tankId}
              onChange={(e) => setTankId(e.target.value)}
              required
            >
              <option value="" disabled>Select a tank...</option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.deviceId}>
                  {tank.deviceName} ({tank.deviceId})
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary devices-form-submit"
          disabled={busy || loadingTanks || tanks.length === 0}
        >
          {busy ? 'Assigning...' : 'Assign'}
        </button>
      </form>
    </div>
  );
}

