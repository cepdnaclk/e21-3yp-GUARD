import React from 'react';
// water-tank.css has been fully migrated to Tailwind utility classes below.
// The original file (../styles/water-tank.css) is retained on disk but no longer imported.

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
  const lowThresholdPercent  = minThreshold !== undefined ? ((rangeMax - minThreshold)  / (rangeMax - rangeMin)) * 100 : null;
  const highThresholdPercent = maxThreshold !== undefined ? ((rangeMax - maxThreshold) / (rangeMax - rangeMin)) * 100 : null;

  const isAlert = isPersistentAlert ||
                  (minThreshold !== undefined && value > minThreshold) ||
                  (maxThreshold !== undefined && value < maxThreshold);

  return (
    <>
      {/* Self-contained keyframe — keeps the component independent of water-tank.css */}
      <style>{`
        @keyframes waveMove {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .wave-animate { animation: waveMove 4s linear infinite; }
      `}</style>

      {/*
        .water-tank-wrapper → flex flex-col items-center justify-center gap-2 p-2 min-w-[110px] h-full
      */}
      <div className="flex flex-col items-center justify-center gap-2 p-2 min-w-[110px] h-full">

        {/*
          .tank-label → text-xs font-bold text-text-muted tracking-wide
          dark: variant adapts text via theme color (text-muted is already dark-mode-neutral)
        */}
        <div className="text-xs font-bold text-text-muted tracking-wide dark:text-slate-400">
          {label}
        </div>

        {/*
          .tank-container → w-[60px] h-[80px] relative my-1
        */}
        <div className="w-[60px] h-[80px] relative my-1">

          {/*
            .tank-shell →
              Glass shell: bg-white/5 backdrop-blur-sm border-2 border-white/30 rounded-[12px_12px_18px_18px]
              Inner shadow via ring utilities + overflow-hidden
            dark: border opacity drops slightly
          */}
          <div
            className={[
              'w-full h-full relative overflow-hidden',
              'bg-white/5 backdrop-blur-sm',
              'border-2 rounded-[12px_12px_18px_18px]',
              'shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)]',
              // Light mode: subtle slate border | dark: slightly more opaque white border
              isAlert
                ? 'border-red-400/40 dark:border-red-500/30'
                : 'border-slate-300/40 dark:border-white/20',
            ].join(' ')}
          >
            {/* ── Threshold Markers ─────────────────────────────────────
                Position uses dynamic runtime % → must stay as inline style.
                Tailwind handles the visual styling (border dashes, colors).
            */}
            {lowThresholdPercent !== null && (
              <div
                className="absolute left-0 w-full h-0 z-10 pointer-events-none border-t-2 border-dashed border-amber-400/60"
                style={{ bottom: `${lowThresholdPercent}%` }}
              >
                <span className="absolute right-[-22px] top-[-8px] text-[0.6rem] font-extrabold text-black/30 dark:text-white/30">
                  LOW
                </span>
              </div>
            )}

            {highThresholdPercent !== null && (
              <div
                className="absolute left-0 w-full h-0 z-10 pointer-events-none border-t-2 border-dashed border-red-400/60"
                style={{ bottom: `${highThresholdPercent}%` }}
              >
                <span className="absolute right-[-22px] top-[-8px] text-[0.6rem] font-extrabold text-black/30 dark:text-white/30">
                  HIGH
                </span>
              </div>
            )}

            {/* ── Water Fill ────────────────────────────────────────────
                Height is dynamic → must stay as inline style.
                Gradient and transition handled by Tailwind.
                Alert state switches to red gradient.
            */}
            <div
              className={[
                'absolute bottom-0 left-0 w-full transition-[height] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]',
                isAlert
                  ? 'bg-gradient-to-b from-red-400 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                  : 'bg-gradient-to-b from-sky-400 to-blue-500 shadow-[0_0_10px_rgba(66,153,225,0.3)]',
              ].join(' ')}
              style={{ height: `${fillPercent}%` }}
            >
              {/* ── Wave animation strip ── */}
              <div
                className="wave-animate absolute top-[-10px] left-0 w-[200%] h-[20px] bg-[length:50%_100%]"
                style={{
                  backgroundImage: `url('data:image/svg+xml;utf8,<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><path d="M0,50 Q250,100 500,50 T1000,50 L1000,100 L0,100 Z" fill="white" fill-opacity="0.2"/></svg>')`,
                }}
              />
            </div>
          </div>
        </div>

        {/*
          .tank-value-display → flex items-baseline gap-[2px] font-sans
        */}
        <div className="flex items-baseline gap-[2px] font-sans">
          {/*
            .current-val → text-xl font-bold text-primary (or danger on alert)
            dark: primary color already works against dark backgrounds
          */}
          <span
            className={[
              'text-xl font-bold',
              isAlert ? 'text-danger dark:text-red-400' : 'text-primary dark:text-sky-400',
            ].join(' ')}
          >
            {value}
          </span>

          {/*
            .unit → text-xs font-semibold text-text-muted
          */}
          <span className="text-xs font-semibold text-text-muted dark:text-slate-400">
            {unit}
          </span>
        </div>

      </div>
    </>
  );
}
