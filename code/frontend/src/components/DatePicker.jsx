import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
// datepicker.css — the .gdp-* classes are migrated to Tailwind below.
// The .rdp-* library overrides are kept in the <style> block to target react-day-picker DOM nodes.

/**
 * GlassDatePicker — A glass-styled datetime picker built on react-day-picker v10.
 *
 * Props:
 *  - value: string  (ISO datetime string like "2025-01-15T14:30" or "" for none)
 *  - onChange: (isoString: string) => void
 *  - label: string  (placeholder label)
 *  - id: string     (for accessibility)
 */
export default function GlassDatePicker({ value, onChange, label = 'Select date', id }) {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [timeStr, setTimeStr] = useState('00:00');
  const wrapperRef = useRef(null);

  // Parse incoming value into day + time
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d)) {
        setSelectedDay(d);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setTimeStr(`${hh}:${mm}`);
        return;
      }
    }
    setSelectedDay(null);
    setTimeStr('00:00');
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buildIso = (day, time) => {
    if (!day) return '';
    const [hh, mm] = (time || '00:00').split(':');
    const d = new Date(day);
    d.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleDaySelect = (day) => { setSelectedDay(day || null); };
  const handleApply = () => { onChange(buildIso(selectedDay, timeStr)); setOpen(false); };
  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedDay(null);
    setTimeStr('00:00');
    onChange('');
    setOpen(false);
  };

  const displayText = selectedDay
    ? `${selectedDay.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} ${timeStr}`
    : label;

  return (
    <>
      {/*
        .rdp-* overrides for react-day-picker — must stay here since
        they target library-generated DOM nodes not owned by React classes.
        @keyframes gdp-fadein kept here too (arbitrary value in Tailwind would not work for named animations).
      */}
      <style>{`
        @keyframes gdp-fadein {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .rdp {
          --rdp-accent-color: #0ea5e9;
          --rdp-accent-color-dark: #38bdf8;
          --rdp-background-color: rgba(14,165,233,0.10);
          --rdp-outline: 2px solid var(--rdp-accent-color);
          --rdp-outline-selected: 2px solid var(--rdp-accent-color);
          margin: 0;
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem;
        }
        .rdp-caption {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 0 0.25rem 0.75rem;
          border-bottom: 1px solid rgba(200,220,240,0.55);
          margin-bottom: 0.5rem;
        }
        .rdp-caption_label { font-size: 0.95rem; font-weight: 700; color: var(--text); }
        [data-theme='dark'] .rdp-caption_label { color: #e6edf3; }
        .rdp-nav_button {
          width:28px; height:28px; border-radius:8px;
          border:1px solid rgba(200,220,240,0.4);
          background:rgba(255,255,255,0.1); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:all 0.15s ease; color:#64748b;
        }
        .rdp-nav_button:hover { background:rgba(255,255,255,0.2); border-color:#0ea5e9; color:#0ea5e9; }
        [data-theme='dark'] .rdp-nav_button { border-color:rgba(255,255,255,0.08); background:rgba(255,255,255,0.05); color:#8b949e; }
        [data-theme='dark'] .rdp-nav_button:hover { background:rgba(56,189,248,0.12); border-color:#38bdf8; color:#38bdf8; }
        .rdp-head_cell { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#64748b; padding-bottom:0.5rem; }
        .rdp-day {
          width:34px; height:34px; border-radius:8px; font-size:0.85rem;
          font-weight:500; color:var(--text); transition:all 0.12s ease;
          border:none; background:transparent; cursor:pointer;
        }
        .rdp-day:hover:not([disabled]):not(.rdp-day_selected) { background:rgba(14,165,233,0.10); color:#0ea5e9; }
        [data-theme='dark'] .rdp-day { color:#e6edf3; }
        [data-theme='dark'] .rdp-day:hover:not([disabled]):not(.rdp-day_selected) { background:rgba(56,189,248,0.10); color:#38bdf8; }
        .rdp-day_selected, .rdp-day_selected:focus, .rdp-day_selected:hover {
          background: linear-gradient(135deg,#0ea5e9,#0284c7) !important;
          color:#fff !important; font-weight:700;
          box-shadow:0 4px 12px rgba(14,165,233,0.40); border-radius:8px;
        }
        [data-theme='dark'] .rdp-day_selected, [data-theme='dark'] .rdp-day_selected:hover {
          background: linear-gradient(135deg,#38bdf8,#0ea5e9) !important;
          box-shadow:0 4px 12px rgba(56,189,248,0.40);
        }
        .rdp-day_today:not(.rdp-day_selected) { border:1.5px solid #0ea5e9 !important; color:#0ea5e9; font-weight:700; }
        [data-theme='dark'] .rdp-day_today:not(.rdp-day_selected) { border-color:#38bdf8 !important; color:#38bdf8; }
        .rdp-day_outside { opacity:0.3; }
        .rdp-day_disabled { opacity:0.25; cursor:not-allowed; }
      `}</style>

      {/*
        .gdp-wrapper → relative inline-block z-[100]
      */}
      <div className="relative inline-block z-[100]" ref={wrapperRef} id={id}>

        {/*
          .gdp-input → glass trigger button
          open state adds border-primary + ring
        */}
        <div
          className={[
            'flex items-center gap-2 px-[0.9rem] py-[0.65rem]',
            'border-[1.5px] rounded-[10px]',
            'bg-white/40 dark:bg-white/[0.06]',
            'backdrop-blur-sm text-text-main dark:text-[#e6edf3]',
            'text-[0.9rem] font-sans cursor-pointer min-w-[180px] select-none',
            'transition-all duration-200',
            open
              ? 'border-primary shadow-[0_0_0_3px_rgba(14,165,233,0.15)] dark:border-sky-400 dark:bg-white/10'
              : 'border-white/20 dark:border-white/10 hover:border-primary dark:hover:border-sky-400',
          ].join(' ')}
          onClick={() => setOpen((v) => !v)}
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={open}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v); }}
        >
          {/* .gdp-input-icon */}
          <span className="text-base opacity-65">📅</span>
          {/* .gdp-input-text */}
          <span className="flex-1">{displayText}</span>
          {value && (
            <button
              type="button"
              className="bg-transparent border-none cursor-pointer text-[0.85rem] opacity-55 px-[0.1rem] text-inherit leading-none hover:opacity-100 transition-opacity"
              onClick={handleClear}
              aria-label="Clear date"
            >
              ✕
            </button>
          )}
        </div>

        {/* .gdp-dropdown → glass calendar panel */}
        {open && (
          <div
            className="absolute top-[calc(100%+8px)] left-0 z-[9999] bg-white/80 dark:bg-[rgba(13,20,35,0.90)] backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[18px] shadow-[0_20px_60px_rgba(14,52,84,0.18)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.60)] p-4 min-w-[300px]"
            style={{ animation: 'gdp-fadein 0.18s cubic-bezier(0.22,1,0.36,1)' }}
            role="dialog"
            aria-label={`Select date for ${label}`}
          >
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={handleDaySelect}
              showOutsideDays
            />

            {/* .gdp-time-section → flex items-center gap-2 mt-3 pt-3 border-t */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20 dark:border-white/[0.06]">
              {/* .gdp-time-label */}
              <span className="text-[0.8rem] font-semibold text-text-muted dark:text-slate-400 whitespace-nowrap">
                Time:
              </span>
              {/* .gdp-time-input */}
              <input
                type="time"
                className="flex-1 px-[0.6rem] py-[0.4rem] border-[1.5px] border-white/20 dark:border-white/[0.08] rounded-lg bg-white/10 dark:bg-white/[0.05] text-text-main dark:text-[#e6edf3] text-[0.85rem] font-mono outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(14,165,233,0.15)] transition-all"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                aria-label="Time"
              />
            </div>

            {/* .gdp-apply-btn → full-width gradient primary button */}
            <button
              type="button"
              className="block w-full mt-3 py-2 px-4 bg-gradient-to-br from-primary to-primary-dark dark:from-sky-400 dark:to-primary text-white border-none rounded-[10px] text-[0.875rem] font-bold font-sans cursor-pointer shadow-[0_4px_12px_rgba(14,165,233,0.30)] dark:shadow-[0_4px_12px_rgba(56,189,248,0.30)] hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(14,165,233,0.40)] transition-all"
              onClick={handleApply}
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </>
  );
}
