import { useState } from 'react';
import { deviceApi } from '../services/api';
// thresholds.css migrated to Tailwind utility classes below.

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
    <>
      {/*
        ::-webkit-slider-thumb pseudo-element cannot be targeted by Tailwind.
        Kept minimal — only the 6 lines that require it.
      */}
      <style>{`
        /* ── Dual-range slider: both tracks MUST be transparent ── */
        .tw-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          height: 30px;        /* tall enough that thumb never clips */
          cursor: pointer;
        }
        .tw-range::-webkit-slider-runnable-track {
          background: transparent;
          height: 6px;
        }
        .tw-range::-moz-range-track {
          background: transparent;
          height: 6px;
        }
        .tw-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: auto;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #4299e1;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: transform 0.15s, box-shadow 0.15s;
          margin-top: -8px;   /* centre the thumb on the 6px track */
        }
        .tw-range::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 6px rgba(66,153,225,0.20);
        }
        .tw-range:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 4px rgba(66,153,225,0.40);
        }
        .tw-range.min-slider::-webkit-slider-thumb { border-color: #f6ad55; }
        .tw-range.min-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 6px rgba(246,173,85,0.20);
        }
        /* Firefox */
        .tw-range::-moz-range-thumb {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #4299e1;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .tw-range.min-slider::-moz-range-thumb { border-color: #f6ad55; }
      `}</style>

      {/*
        .threshold-card → glass card formula
        bg-white/60 dark:bg-slate-800/40 backdrop-blur-md
        border border-white/40 dark:border-white/10 shadow-xl rounded-2xl
      */}
      <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl">

        {/* .card-header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/20 dark:border-white/10 px-6 pt-6">
          <h3 className="text-base font-bold text-text-main dark:text-slate-100">System Thresholds</h3>
          <p className="text-text-muted dark:text-slate-400 text-sm">Dual-range monitoring limits</p>
        </div>

        <form onSubmit={handleSave}>
          {/* .threshold-slider-grid → grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 p-6 */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 p-6">
            {CATEGORIES.map((cat) => {
              const hasMin = !!cat.minKey;
              const hasMax = !!cat.maxKey;

              const minVal = hasMin ? (thresholds[cat.minKey] ?? cat.rangeMin) : null;
              const maxVal = hasMax ? (thresholds[cat.maxKey] ?? cat.rangeMax) : null;

              const minPercent = hasMin ? ((minVal - cat.rangeMin) / (cat.rangeMax - cat.rangeMin)) * 100 : 0;
              const maxPercent = hasMax ? ((maxVal - cat.rangeMin) / (cat.rangeMax - cat.rangeMin)) * 100 : 100;

              return (
                /* .threshold-category-box → glass sub-card */
                <div
                  className="bg-white/[0.04] dark:bg-white/[0.02] p-[1.35rem] rounded-xl border border-white/10 dark:border-white/[0.08] transition-all hover:bg-white/[0.06] dark:hover:bg-white/[0.04]"
                  key={cat.id}
                >
                  {/* .category-header → flex justify-between items-center mb-5 */}
                  <div className="flex justify-between items-center mb-5">
                    {/* .category-title */}
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {cat.name}
                    </span>
                    {/* .value-display → flex gap-2 font-semibold */}
                    <div className="flex gap-2 font-semibold font-sans">
                      {hasMin && (
                        /* .val-badge.val-min → amber tint */
                        <span className="px-2 py-[0.2rem] rounded bg-amber-400/15 text-amber-500 dark:text-amber-400 border border-amber-400/20 text-[0.85rem]">
                          {cat.minLabel || 'Min'}: {minVal}{cat.unit}
                        </span>
                      )}
                      {hasMax && (
                        /* .val-badge.val-max → sky tint */
                        <span className="px-2 py-[0.2rem] rounded bg-sky-400/15 text-sky-600 dark:text-sky-400 border border-sky-400/20 text-[0.85rem]">
                          {cat.maxLabel || 'Max'}: {maxVal}{cat.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/*
                    .dual-slider-container → relative h-[30px] w-full my-4
                    .dual-slider-container.inverted → scale-x-[-1]
                  */}
                  <div
                    className={`relative h-[34px] w-full my-4 ${cat.isInverted ? 'scale-x-[-1]' : ''}`}
                  >
                    {/* .slider-track → absolute track bar */}
                    <div className="absolute top-1/2 left-0 w-full h-[6px] bg-black/10 dark:bg-white/10 rounded-[3px] -translate-y-1/2 z-[1]" />

                    {/* .slider-range-highlight → amber-to-sky gradient bar */}
                    <div
                      className="absolute top-1/2 h-[6px] bg-gradient-to-r from-amber-400 to-sky-400 rounded-[3px] -translate-y-1/2 z-[2]"
                      style={{
                        left: `${minPercent}%`,
                        width: `${maxPercent - minPercent}%`
                      }}
                    />

                    {/* .dual-range-input.min-slider */}
                    {hasMin && (
                      <input
                        type="range"
                        min={cat.rangeMin}
                        max={cat.rangeMax}
                        step={cat.step}
                        value={minVal}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val >= maxVal) return;
                            handleUpdate(cat.minKey, val);
                        }}
                        className="tw-range min-slider absolute top-1/2 left-0 w-full -translate-y-1/2 pointer-events-none m-0 z-[3]"
                      />
                    )}

                    {/* .dual-range-input.max-slider */}
                    {hasMax && (
                      <input
                        type="range"
                        min={cat.rangeMin}
                        max={cat.rangeMax}
                        step={cat.step}
                        value={maxVal}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (hasMin && val <= minVal) return;
                            handleUpdate(cat.maxKey, val);
                        }}
                        className="tw-range max-slider absolute top-1/2 left-0 w-full -translate-y-1/2 pointer-events-none m-0 z-[4]"
                      />
                    )}
                  </div>

                  {/* .range-labels → flex justify-between text-[0.7rem] text-text-muted mt-1 */}
                  <div className="flex justify-between text-[0.7rem] text-text-muted dark:text-slate-500 mt-1">
                    <span>{cat.isInverted ? cat.rangeMax : cat.rangeMin}{cat.unit}</span>
                    <span>{cat.isInverted ? cat.rangeMin : cat.rangeMax}{cat.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message banner */}
          {message.text && (
            <div
              className={[
                'mx-6 mb-4 px-4 py-3 rounded-lg text-sm font-semibold text-center',
                message.type === 'success'
                  ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20',
              ].join(' ')}
            >
              {message.text}
            </div>
          )}

          {/* .form-actions → px-6 pb-6 flex justify-end */}
          <div className="px-6 pb-6 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-[0.65rem] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? 'Processing...' : 'Apply & Sync to Device'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
