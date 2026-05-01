import React from 'react';

/**
 * A premium, compact SVG arc gauge for sensor visualization.
 * Shows current value relative to min/max thresholds.
 */
export default function SensorGauge({ 
  value, 
  minThreshold, 
  maxThreshold, 
  unit, 
  label,
  rangeMin = 0,
  rangeMax = 100,
  isPersistentAlert = false,
  isInverted = false
}) {
  // Normalize values for the 180-degree arc
  const normalize = (val) => {
    const clamped = Math.max(rangeMin, Math.min(rangeMax, val));
    const percent = (clamped - rangeMin) / (rangeMax - rangeMin);
    const degrees = percent * 180;
    return isInverted ? 180 - degrees : degrees;
  };

  const currentAngle = normalize(value);
  
  // For inverted gauges, we need to swap which threshold is "lower" in degrees
  let minAngle = minThreshold !== undefined ? normalize(minThreshold) : null;
  let maxAngle = maxThreshold !== undefined ? normalize(maxThreshold) : null;

  // SVG Constants
  const radius = 40;
  const strokeWidth = 8;
  const center = 50;
  const circumference = Math.PI * radius; // for 180 degrees

  // Check if value is out of bounds OR if there's an unresolved persistent alert
  const isAlert = isPersistentAlert || 
                  (minThreshold !== undefined && value < minThreshold) || 
                  (maxThreshold !== undefined && value > maxThreshold);

  return (
    <div className="sensor-gauge-container">
      <svg viewBox="0 0 100 65" className="sensor-gauge-svg">
        {/* Background Track */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Safe Range Zone (Optional visual indicator) */}
        {minAngle !== null && maxAngle !== null && (
          <path
            d={describeArc(center, center, radius, 180 + minAngle, 180 + maxAngle)}
            fill="none"
            stroke="rgba(34, 197, 94, 0.2)"
            strokeWidth={strokeWidth}
          />
        )}

        {/* Current Value Fill */}
        <path
          d={describeArc(center, center, radius, 180, 180 + currentAngle)}
          fill="none"
          stroke={isAlert ? "#ef4444" : "#0ea5e9"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="gauge-fill-transition"
          style={{ filter: isAlert ? 'drop-shadow(0 0 3px #ef4444)' : 'none' }}
        />

        {/* Threshold Markers */}
        {minAngle !== null && (
          <line
            x1={calculateX(center, radius + 5, 180 + minAngle)}
            y1={calculateY(center, radius + 5, 180 + minAngle)}
            x2={calculateX(center, radius - 5, 180 + minAngle)}
            y2={calculateY(center, radius - 5, 180 + minAngle)}
            stroke="#f6ad55"
            strokeWidth="2"
          />
        )}
        {maxAngle !== null && (
          <line
            x1={calculateX(center, radius + 5, 180 + maxAngle)}
            y1={calculateY(center, radius + 5, 180 + maxAngle)}
            x2={calculateX(center, radius - 5, 180 + maxAngle)}
            y2={calculateY(center, radius - 5, 180 + maxAngle)}
            stroke="#f6ad55"
            strokeWidth="2"
          />
        )}
      </svg>
      
      <div className="gauge-info">
        <span className="gauge-label">{label}</span>
        <div className="gauge-value-wrap">
          <span className={`gauge-value ${isAlert ? 'alert' : ''}`}>{value}</span>
          <span className="gauge-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}

// SVG Math Helpers
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

function calculateX(center, radius, angle) {
  return center + radius * Math.cos((angle * Math.PI) / 180);
}

function calculateY(center, radius, angle) {
  return center + radius * Math.sin((angle * Math.PI) / 180);
}
