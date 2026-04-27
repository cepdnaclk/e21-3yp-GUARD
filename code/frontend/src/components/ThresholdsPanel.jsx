import { useState } from 'react';
import { deviceApi } from '../services/api';

export default function ThresholdsPanel({ tankId, initialThresholds, onUpdate }) {
  const [thresholds, setThresholds] = useState(initialThresholds || {});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setThresholds((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage({ text: '', type: '' });

    try {
      // Convert all values to numbers before sending
      const payload = {};
      Object.entries(thresholds).forEach(([key, val]) => {
        payload[key] = parseFloat(val);
      });

      await deviceApi.updateThresholds(tankId, payload);
      setMessage({ text: 'Thresholds updated successfully!', type: 'success' });
      if (onUpdate) onUpdate();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to update thresholds.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card threshold-panel">
      <div className="card-header">
        <h3>Sensor Thresholds</h3>
        <p className="card-subtitle">Values synced to ESP32 for local monitoring</p>
      </div>
      
      <form onSubmit={handleSave} className="threshold-form">
        <div className="threshold-grid">
          <div className="threshold-group">
            <label>Temperature Min (°C)</label>
            <input 
              type="number" step="0.1" name="tempMin" 
              value={thresholds.tempMin || ''} onChange={handleChange} 
              className="form-control"
            />
          </div>
          <div className="threshold-group">
            <label>Temperature Max (°C)</label>
            <input 
              type="number" step="0.1" name="tempMax" 
              value={thresholds.tempMax || ''} onChange={handleChange} 
              className="form-control"
            />
          </div>

          <div className="threshold-group">
            <label>TDS Min (ppm)</label>
            <input 
              type="number" name="tdsMin" 
              value={thresholds.tdsMin || ''} onChange={handleChange} 
              className="form-control"
            />
          </div>
          <div className="threshold-group">
            <label>TDS Max (ppm)</label>
            <input 
              type="number" name="tdsMax" 
              value={thresholds.tdsMax || ''} onChange={handleChange} 
              className="form-control"
            />
          </div>

          <div className="threshold-group">
            <label>pH Min</label>
            <input 
              type="number" step="0.1" name="phMin" 
              value={thresholds.phMin || ''} onChange={handleChange} 
              className="form-control"
            />
          </div>
          <div className="threshold-group">
            <label>pH Max</label>
            <input 
              type="number" step="0.1" name="phMax" 
              value={thresholds.phMax || ''} onChange={handleChange} 
              className="form-control"
            />
          </div>

          <div className="threshold-group">
            <label>Turbidity Max (NTU)</label>
            <input 
              type="number" step="1" name="turbidityMax" 
              value={thresholds.turbidityMax || ''} onChange={handleChange} 
              className="form-control"
            />
          </div>

          <div className="threshold-group">
            <label>Water Level Low (%)</label>
            <input 
              type="number" name="waterLevelThreshold" 
              value={thresholds.waterLevelThreshold || ''} onChange={handleChange} 
              className="form-control"
            />
          </div>
          <div className="threshold-group">
            <label>Water Level High (%)</label>
            <input 
              type="number" name="waterStopThreshold" 
              value={thresholds.waterStopThreshold || ''} onChange={handleChange} 
              className="form-control"
            />
          </div>
        </div>

        {message.text && (
          <div className={`message-banner ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving...' : 'Save & Sync to Device'}
          </button>
        </div>
      </form>
    </div>
  );
}
