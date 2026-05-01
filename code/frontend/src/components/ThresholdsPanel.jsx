import { useState } from 'react';
import { deviceApi } from '../services/api';
import '../styles/thresholds.css';

const CATEGORIES = [
    { 
        id: 'temp', 
        name: 'Temperature', 
        unit: '°C', 
        minKey: 'tempMin', 
        maxKey: 'tempMax', 
        rangeMin: 0, 
        rangeMax: 50, 
        step: 0.1 
    },
    { 
        id: 'ph', 
        name: 'pH Level', 
        unit: '', 
        minKey: 'phMin', 
        maxKey: 'phMax', 
        rangeMin: 0, 
        rangeMax: 14, 
        step: 0.1 
    },
    { 
        id: 'tds', 
        name: 'TDS (Purity)', 
        unit: 'ppm', 
        minKey: 'tdsMin', 
        maxKey: 'tdsMax', 
        rangeMin: 0, 
        rangeMax: 2000, 
        step: 1 
    },
    { 
        id: 'water', 
        name: 'Water Depth', 
        unit: 'cm', 
        minKey: 'waterStopThreshold', 
        maxKey: 'waterLevelThreshold', 
        rangeMin: 0, 
        rangeMax: 200, 
        step: 1,
        minLabel: 'High (Stop)',
        maxLabel: 'Low (Dist)',
        isInverted: true
    },
    { 
        id: 'turb', 
        name: 'Turbidity', 
        unit: 'NTU', 
        maxKey: 'turbidityMax', 
        rangeMin: 0, 
        rangeMax: 1000, 
        step: 1 
    },
];

export default function ThresholdsPanel({ tankId, initialThresholds, onUpdate }) {
  const [thresholds, setThresholds] = useState(initialThresholds || {});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleUpdate = (key, value) => {
    setThresholds(prev => ({ ...prev, [key]: parseFloat(value) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage({ text: '', type: '' });

    try {
      await deviceApi.updateThresholds(tankId, thresholds);
      setMessage({ text: 'Thresholds synced successfully!', type: 'success' });
      if (onUpdate) onUpdate();
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (err) {
      setMessage({ text: err.message || 'Failed to sync.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card threshold-card">
      <div className="card-header">
        <h3>System Thresholds</h3>
        <p className="card-subtitle">Dual-range monitoring limits</p>
      </div>
      
      <form onSubmit={handleSave}>
        <div className="threshold-slider-grid">
          {CATEGORIES.map((cat) => {
            const hasMin = !!cat.minKey;
            const hasMax = !!cat.maxKey;
            
            const minVal = hasMin ? (thresholds[cat.minKey] ?? cat.rangeMin) : null;
            const maxVal = hasMax ? (thresholds[cat.maxKey] ?? cat.rangeMax) : null;

            // Calculate percentage positions for the highlight track
            const minPercent = hasMin ? ((minVal - cat.rangeMin) / (cat.rangeMax - cat.rangeMin)) * 100 : 0;
            const maxPercent = hasMax ? ((maxVal - cat.rangeMin) / (cat.rangeMax - cat.rangeMin)) * 100 : 100;

            return (
              <div className={`threshold-category-box ${!hasMin ? 'single-slider' : ''}`} key={cat.id}>
                <div className="category-header">
                  <span className="category-title">{cat.name}</span>
                  <div className="value-display">
                    {hasMin && <span className="val-badge val-min">{cat.minLabel || 'Min'}: {minVal}{cat.unit}</span>}
                    {hasMax && <span className="val-badge val-max">{cat.maxLabel || 'Max'}: {maxVal}{cat.unit}</span>}
                  </div>
                </div>

                <div className={`dual-slider-container ${cat.isInverted ? 'inverted' : ''}`}>
                  <div className="slider-track" />
                  <div 
                    className="slider-range-highlight" 
                    style={{ 
                      left: `${minPercent}%`, 
                      width: `${maxPercent - minPercent}%` 
                    }} 
                  />
                  
                  {hasMin && (
                    <input 
                      type="range"
                      min={cat.rangeMin}
                      max={cat.rangeMax}
                      step={cat.step}
                      value={minVal}
                      onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val >= maxVal) return; // Prevent crossover
                          handleUpdate(cat.minKey, val);
                      }}
                      className="dual-range-input min-slider"
                    />
                  )}

                  {hasMax && (
                    <input 
                      type="range"
                      min={cat.rangeMin}
                      max={cat.rangeMax}
                      step={cat.step}
                      value={maxVal}
                      onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (hasMin && val <= minVal) return; // Prevent crossover
                          handleUpdate(cat.maxKey, val);
                      }}
                      className="dual-range-input max-slider"
                    />
                  )}
                </div>

                <div className="range-labels">
                    <span>{cat.isInverted ? cat.rangeMax : cat.rangeMin}{cat.unit}</span>
                    <span>{cat.isInverted ? cat.rangeMin : cat.rangeMax}{cat.unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {message.text && (
          <div className={`message-banner ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Processing...' : 'Apply & Sync to Device'}
          </button>
        </div>
      </form>
    </div>
  );
}
