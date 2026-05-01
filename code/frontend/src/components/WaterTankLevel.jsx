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
  // Normalize value to percentage (0 = Empty, 100 = Full)
  // Distance: rangeMax (200) = 0%, rangeMin (0) = 100%
  const clamped = Math.max(rangeMin, Math.min(rangeMax, value));
  const fillPercent = ((rangeMax - clamped) / (rangeMax - rangeMin)) * 100;

  // Threshold indicators as percentages from bottom
  const lowThresholdPercent = minThreshold !== undefined ? ((rangeMax - minThreshold) / (rangeMax - rangeMin)) * 100 : null;
  const highThresholdPercent = maxThreshold !== undefined ? ((rangeMax - maxThreshold) / (rangeMax - rangeMin)) * 100 : null;

  const isAlert = isPersistentAlert || 
                  (minThreshold !== undefined && value > minThreshold) || 
                  (maxThreshold !== undefined && value < maxThreshold);

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
