import React from 'react';
import '../styles/water-tank.css';

export default function WaterTankLevel({ 
  value, 
  minThreshold, 
  maxThreshold, 
  unit, 
  label,
  rangeMin = 0,
  rangeMax = 200,
  isPersistentAlert = false
}) {
  // The backend now stores & emits water level as a 0–100% value.
  // Simply clamp it and use it directly as the fill height.
  const fillPercent = Math.max(0, Math.min(100, value));

  // Threshold indicators: minThreshold and maxThreshold are now also in %
  const lowThresholdPercent = minThreshold !== undefined ? Math.max(0, Math.min(100, minThreshold)) : null;
  const highThresholdPercent = maxThreshold !== undefined ? Math.max(0, Math.min(100, maxThreshold)) : null;

  const isAlert = isPersistentAlert || 
                  (minThreshold !== undefined && value < minThreshold) ||
                  (maxThreshold !== undefined && value > maxThreshold);

  return (
    <div className={`water-tank-wrapper ${isAlert ? 'tank-alert' : ''}`}>
      <div className="tank-label">{label}</div>
      <div className="tank-container">
        {/* Glass Tank Shell */}
        <div className="tank-shell">
          {/* Threshold Markers */}
          {lowThresholdPercent !== null && (
            <div className="threshold-marker low" style={{ bottom: `${lowThresholdPercent}%` }}>
               <span className="marker-label">LOW</span>
            </div>
          )}
          {highThresholdPercent !== null && (
            <div className="threshold-marker high" style={{ bottom: `${highThresholdPercent}%` }}>
               <span className="marker-label">HIGH</span>
            </div>
          )}

          {/* Water Fill */}
          <div 
            className="water-fill" 
            style={{ height: `${fillPercent}%` }}
          >
            <div className="water-wave" />
          </div>
        </div>
      </div>
      <div className="tank-value-display">
        <span className="current-val">{value}</span>
        <span className="unit">{unit}</span>
      </div>
    </div>
  );
}
