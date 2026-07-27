import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import '../styles/datepicker.css';

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
    // Format as "YYYY-MM-DDTHH:mm" (local, no Z) — matches datetime-local format
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleDaySelect = (day) => {
    setSelectedDay(day || null);
  };

  const handleApply = () => {
    onChange(buildIso(selectedDay, timeStr));
    setOpen(false);
  };

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
    <div className="gdp-wrapper" ref={wrapperRef} id={id}>
      <div
        className={`gdp-input${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v); }}
      >
        <span className="gdp-input-icon">📅</span>
        <span className="gdp-input-text">{displayText}</span>
        {value && (
          <button
            type="button"
            className="gdp-input-clear"
            onClick={handleClear}
            aria-label="Clear date"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="gdp-dropdown" role="dialog" aria-label={`Select date for ${label}`}>
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={handleDaySelect}
            showOutsideDays
          />

          {/* Time input */}
          <div className="gdp-time-section">
            <span className="gdp-time-label">Time:</span>
            <input
              type="time"
              className="gdp-time-input"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              aria-label="Time"
            />
          </div>

          <button type="button" className="gdp-apply-btn" onClick={handleApply}>
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
