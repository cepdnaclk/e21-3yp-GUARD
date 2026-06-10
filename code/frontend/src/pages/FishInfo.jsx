import { useState, useEffect } from 'react';
import { fishApi, deviceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/fish-info.css';

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */

/** Format a min/max pair into a readable range string */
function fmtRange(min, max, unit = '') {
  if (min == null && max == null) return '—';
  if (min == null) return `≤ ${max}${unit}`;
  if (max == null) return `≥ ${min}${unit}`;
  return `${min} – ${max}${unit}`;
}

/** Check if a sensor value falls within the species' safe range */
function isCompatible(value, min, max) {
  if (value == null) return null;        // unknown
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/* ────────────────────────────────────────────────────────────────
   Sub-component: Individual fish card in the grid
   ──────────────────────────────────────────────────────────────── */
function FishCard({ fish, onClick }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="fish-card" onClick={() => onClick(fish)} role="button" tabIndex={0}
         onKeyDown={(e) => e.key === 'Enter' && onClick(fish)}>

      <div className="fish-card-img-wrap">
        {fish.imageUrl && !imgError
          ? <img
              className="fish-card-img"
              src={fish.imageUrl}
              alt={fish.name}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          : <div className="fish-card-img-placeholder">🐠</div>
        }
      </div>

      <div className="fish-card-body">
        <div className="fish-card-name">{fish.name}</div>
        {fish.scientificName && (
          <div className="fish-card-sci">{fish.scientificName}</div>
        )}
        <div className="fish-card-params">
          {fish.tempMin != null && (
            <span className="fish-param-chip">🌡 {fmtRange(fish.tempMin, fish.tempMax)}°C</span>
          )}
          {fish.phMin != null && (
            <span className="fish-param-chip">⚗ pH {fmtRange(fish.phMin, fish.phMax)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Sub-component: Detail drawer
   ──────────────────────────────────────────────────────────────── */
function FishDetailDrawer({ fish, tanks, role, onClose }) {
  const [selectedTankId, setSelectedTankId] = useState('');
  const [presetBusy, setPresetBusy]         = useState(false);
  const [presetMsg, setPresetMsg]           = useState(null);  // { type:'success'|'error', text }
  const [bannerError, setBannerError]       = useState(false);

  // Reset state when fish changes
  useEffect(() => {
    setSelectedTankId('');
    setPresetMsg(null);
    setBannerError(false);
  }, [fish?.id]);

  const selectedTank = tanks.find(t => t.deviceId === selectedTankId);
  const canApplyPreset = (role === 'ADMIN' || role === 'SUPER_ADMIN') && selectedTankId;

  /** Build compatibility rows from live tank stats vs fish ranges */
  const compatRows = selectedTank
    ? [
        {
          label: 'Temperature',
          icon: '🌡',
          unit: '°C',
          value: selectedTank.currentStats?.temp,
          min: fish.tempMin,
          max: fish.tempMax,
          range: fmtRange(fish.tempMin, fish.tempMax, '°C'),
        },
        {
          label: 'pH',
          icon: '⚗',
          unit: '',
          value: selectedTank.currentStats?.pH,
          min: fish.phMin,
          max: fish.phMax,
          range: fmtRange(fish.phMin, fish.phMax),
        },
        {
          label: 'TDS',
          icon: '💧',
          unit: ' ppm',
          value: selectedTank.currentStats?.tds,
          min: fish.tdsMin,
          max: fish.tdsMax,
          range: fmtRange(fish.tdsMin, fish.tdsMax, ' ppm'),
        },
        {
          label: 'Turbidity',
          icon: '🌊',
          unit: ' NTU',
          value: selectedTank.currentStats?.turbidity,
          min: null,
          max: fish.turbidityMax,
          range: fish.turbidityMax != null ? `≤ ${fish.turbidityMax} NTU` : '—',
        },
      ]
    : [];

  /** Apply fish water ranges as threshold preset to the selected tank */
  async function handleApplyPreset() {
    if (!canApplyPreset) return;
    setPresetBusy(true);
    setPresetMsg(null);
    try {
      const payload = {};
      if (fish.tempMin != null) payload.tempMin = fish.tempMin;
      if (fish.tempMax != null) payload.tempMax = fish.tempMax;
      if (fish.phMin   != null) payload.phMin   = fish.phMin;
      if (fish.phMax   != null) payload.phMax   = fish.phMax;
      if (fish.tdsMin  != null) payload.tdsMin  = fish.tdsMin;
      if (fish.tdsMax  != null) payload.tdsMax  = fish.tdsMax;
      if (fish.turbidityMax != null) payload.turbidityMax = fish.turbidityMax;

      await deviceApi.updateThresholds(selectedTankId, payload);
      setPresetMsg({ type: 'success', text: `Thresholds for "${selectedTank.deviceName || selectedTankId}" updated to match ${fish.name} requirements!` });
    } catch (err) {
      setPresetMsg({ type: 'error', text: err.message || 'Failed to apply preset.' });
    } finally {
      setPresetBusy(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fish-drawer-overlay" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <aside className="fish-drawer" role="dialog" aria-modal="true" aria-label={`${fish.name} details`}>
        <button className="fish-drawer-close" onClick={onClose} aria-label="Close">×</button>

        {/* Banner Image */}
        {fish.imageUrl && !bannerError
          ? <img
              className="fish-drawer-banner"
              src={fish.imageUrl}
              alt={fish.name}
              onError={() => setBannerError(true)}
            />
          : <div className="fish-drawer-banner-placeholder">🐠</div>
        }

        <div className="fish-drawer-content">

          {/* ── Species Identity ── */}
          <div>
            <h2 className="fish-drawer-title">{fish.name}</h2>
            {fish.scientificName && <p className="fish-drawer-sci">{fish.scientificName}</p>}
            {fish.description    && <p className="fish-drawer-desc">{fish.description}</p>}
          </div>

          {/* ── Water Condition Ranges ── */}
          <div>
            <p className="fish-section-label">Recommended Water Conditions</p>
            <div className="fish-ranges-grid">
              <div className="fish-range-card temp-card">
                <div className="fish-range-icon">🌡</div>
                <div className="fish-range-label">Temperature</div>
                <div className="fish-range-value">{fmtRange(fish.tempMin, fish.tempMax)}</div>
                <div className="fish-range-unit">°C</div>
              </div>
              <div className="fish-range-card ph-card">
                <div className="fish-range-icon">⚗</div>
                <div className="fish-range-label">pH Level</div>
                <div className="fish-range-value">{fmtRange(fish.phMin, fish.phMax)}</div>
                <div className="fish-range-unit">pH units</div>
              </div>
              <div className="fish-range-card tds-card">
                <div className="fish-range-icon">💧</div>
                <div className="fish-range-label">TDS</div>
                <div className="fish-range-value">{fmtRange(fish.tdsMin, fish.tdsMax)}</div>
                <div className="fish-range-unit">ppm</div>
              </div>
              <div className="fish-range-card turb-card">
                <div className="fish-range-icon">🌊</div>
                <div className="fish-range-label">Turbidity</div>
                <div className="fish-range-value">
                  {fish.turbidityMax != null ? `≤ ${fish.turbidityMax}` : '—'}
                </div>
                <div className="fish-range-unit">NTU</div>
              </div>
            </div>
          </div>

          {/* ── Tank Compatibility Checker ── */}
          <div className="fish-compat-section">
            <p className="fish-section-label">Tank Compatibility Checker</p>

            {tanks.length === 0 ? (
              <div className="compat-no-tank">No tanks available to compare.</div>
            ) : (
              <>
                <select
                  id="fish-tank-select"
                  className="fish-compat-select"
                  value={selectedTankId}
                  onChange={(e) => { setSelectedTankId(e.target.value); setPresetMsg(null); }}
                >
                  <option value="">— Select a tank to compare —</option>
                  {tanks.map(t => (
                    <option key={t.deviceId} value={t.deviceId}>
                      {t.deviceName || t.deviceId} ({t.deviceId})
                    </option>
                  ))}
                </select>

                {selectedTank ? (
                  <table className="fish-compat-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Tank Value</th>
                        <th>Safe Range</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {compatRows.map(row => {
                        const ok = isCompatible(row.value, row.min, row.max);
                        const rowClass = ok === true ? 'compat-ok' : ok === false ? 'compat-bad' : '';
                        return (
                          <tr key={row.label} className={rowClass}>
                            <td><strong>{row.icon} {row.label}</strong></td>
                            <td>
                              {row.value != null
                                ? `${typeof row.value === 'number' ? row.value.toFixed(1) : row.value}${row.unit}`
                                : <span style={{ color: 'var(--text-muted)' }}>No data</span>
                              }
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{row.range}</td>
                            <td>
                              {ok === true  && <span className="compat-status-ok"  title="Within safe range">✓</span>}
                              {ok === false && <span className="compat-status-bad" title="Outside safe range">✗</span>}
                              {ok === null  && <span className="compat-status-na">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="compat-no-tank">
                    Select a tank above to see how well its current water conditions match this species.
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Apply as Preset (ADMIN / SUPER_ADMIN only) ── */}
          {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
            <div className="fish-preset-section">
              <p className="fish-section-label">Apply as Tank Preset</p>
              <p className="fish-preset-hint">
                Instantly set the selected tank's alert thresholds to match this species' recommended water conditions.
                This will trigger new alerts if the current readings fall outside the new ranges.
              </p>
              <button
                id="fish-apply-preset-btn"
                className="fish-preset-btn"
                onClick={handleApplyPreset}
                disabled={!selectedTankId || presetBusy}
              >
                {presetBusy ? '⏳ Applying…' : `🎯 Apply ${fish.name} Preset`}
              </button>
              {presetMsg?.type === 'success' && (
                <p className="fish-preset-success">✓ {presetMsg.text}</p>
              )}
              {presetMsg?.type === 'error' && (
                <p className="fish-preset-error">⚠ {presetMsg.text}</p>
              )}
            </div>
          )}

        </div>
      </aside>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main Page
   ──────────────────────────────────────────────────────────────── */
export default function FishInfo() {
  const { role } = useAuth();

  const [fish,        setFish]        = useState([]);
  const [tanks,       setTanks]       = useState([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [selected,    setSelected]    = useState(null);   // fish currently shown in drawer

  /* ── Load fish catalogue + user's tanks in parallel ── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [fishList, tankList] = await Promise.all([
          fishApi.list(),
          deviceApi.list(),
        ]);
        if (!cancelled) {
          setFish(fishList);
          setTanks(tankList);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load fish data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /* ── Client-side search filter (the backend also supports ?search=) ── */
  const filtered = fish.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.scientificName && f.scientificName.toLowerCase().includes(q))
    );
  });

  /* ── Close drawer on Escape key ── */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  /* ── Render ── */
  if (loading) return <div className="empty-state"><p>Loading fish species…</p></div>;
  if (error)   return <div className="empty-state"><p className="error-msg">{error}</p></div>;

  return (
    <div className="fish-page">

      {/* ── Page Header ── */}
      <div className="fish-page-header">
        <div>
          <h1 className="fish-page-title">🐠 Fish Info</h1>
          <p className="fish-page-subtitle">
            Browse freshwater species and compare their water needs against your tanks.
          </p>
        </div>
        <div className="fish-search-wrap">
          <span className="fish-search-icon">🔍</span>
          <input
            id="fish-search-input"
            className="fish-search"
            type="text"
            placeholder="Search species…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search fish species"
          />
        </div>
      </div>

      {/* ── Fish Grid ── */}
      {filtered.length === 0 ? (
        <div className="fish-empty">
          <div className="fish-empty-icon">🔍</div>
          <p>No species match "{search}". Try a different name.</p>
        </div>
      ) : (
        <div className="fish-grid" id="fish-species-grid">
          {filtered.map(f => (
            <FishCard key={f.id} fish={f} onClick={setSelected} />
          ))}
        </div>
      )}

      {/* ── Detail Drawer ── */}
      {selected && (
        <FishDetailDrawer
          fish={selected}
          tanks={tanks}
          role={role}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
