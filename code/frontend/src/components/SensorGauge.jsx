import React from 'react';
// SensorGauge has no CSS import — it uses classes defined in dashboard.css.
// After this migration those classes are inlined here; they will be removed from dashboard.css.

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

  // Check if value is out of bounds OR if there's an unresolved persistent alert
  const isAlert = isPersistentAlert ||
                  (minThreshold !== undefined && value < minThreshold) ||
                  (maxThreshold !== undefined && value > maxThreshold);

  return (
    <>
      {/* Self-contained: CSS `transition: d 0.8s` is non-standard — cannot be expressed in Tailwind */}
      <style>{`
        .gauge-fill-transition {
          transition: d 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease;
        }
        /* --gauge-track CSS variable referenced by SVG stroke */
        :root { --gauge-track: rgba(14, 52, 84, 0.12); }
        [data-theme='dark'] { --gauge-track: rgba(255,255,255,0.08); }
      `}</style>

      {/*
        .sensor-gauge-container →
          flex flex-col items-center justify-center
          bg-[rgba(14,52,84,0.06)] dark:bg-white/[0.04]
          p-3 px-[0.4rem] rounded-xl
          border border-[rgba(14,52,84,0.10)] dark:border-white/[0.06]
          h-full transition-all
          hover:bg-[rgba(14,52,84,0.10)] dark:hover:bg-white/[0.07]
          hover:border-[rgba(14,52,84,0.18)] dark:hover:border-white/10
      */}
      <div className="flex flex-col items-center justify-center bg-[rgba(14,52,84,0.06)] dark:bg-white/[0.04] p-3 px-[0.4rem] rounded-xl border border-[rgba(14,52,84,0.10)] dark:border-white/[0.06] h-full transition-all hover:bg-[rgba(14,52,84,0.10)] dark:hover:bg-white/[0.07] hover:border-[rgba(14,52,84,0.18)] dark:hover:border-white/10">

        {/* .sensor-gauge-svg → w-full max-w-[90px] h-auto */}
        <svg viewBox="0 0 100 65" className="w-full max-w-[90px] h-auto">
          {/* Background Track */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="var(--gauge-track)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Safe Range Zone */}
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

        {/*
          .gauge-info → text-center -mt-2.5 flex flex-col leading-[1.2]
        */}
        <div className="text-center -mt-2.5 flex flex-col leading-[1.2]">
          {/* .gauge-label → text-[0.65rem] text-text-muted dark:text-slate-400 uppercase tracking-[0.5px] font-semibold */}
          <span className="text-[0.65rem] text-text-muted dark:text-slate-400 uppercase tracking-[0.5px] font-semibold">
            {label}
          </span>

          {/* .gauge-value-wrap → flex items-baseline justify-center gap-px */}
          <div className="flex items-baseline justify-center gap-px">
            {/*
              .gauge-value → text-[1.1rem] font-bold text-[#334155] dark:text-slate-400 font-mono
              .gauge-value.alert → text-red-400 [text-shadow:0_0_8px_rgba(248,113,113,0.4)]
            */}
            <span
              className={[
                'text-[1.1rem] font-bold font-mono',
                isAlert
                  ? 'text-red-400 [text-shadow:0_0_8px_rgba(248,113,113,0.4)]'
                  : 'text-[#334155] dark:text-slate-400',
              ].join(' ')}
            >
              {value}
            </span>

            {/* .gauge-unit → text-[0.65rem] text-text-muted dark:text-slate-500 font-medium */}
            <span className="text-[0.65rem] text-text-muted dark:text-slate-500 font-medium">
              {unit}
            </span>
          </div>
        </div>
      </div>
    </>
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
