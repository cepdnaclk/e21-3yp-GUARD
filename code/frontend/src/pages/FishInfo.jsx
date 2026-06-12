import { useState, useEffect, useRef, useCallback } from 'react';
import { fishApi, deviceApi, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/fish-info.css';

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */
function fmtRange(min, max, unit = '') {
  if (min == null && max == null) return '—';
  if (min == null) return `≤ ${max}${unit}`;
  if (max == null) return `≥ ${min}${unit}`;
  return `${min} – ${max}${unit}`;
}

function isCompatible(value, min, max) {
  if (value == null) return null;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function isThresholdCompatible(tankMin, tankMax, fishMin, fishMax) {
  if (tankMin == null || tankMax == null) return null;
  if (fishMin != null && tankMin < fishMin) return false;
  if (fishMax != null && tankMax > fishMax) return false;
  return true;
}

function isMaxThresholdCompatible(tankMax, fishMax) {
  if (tankMax == null) return null;
  if (fishMax != null && tankMax > fishMax) return false;
  return true;
}

const EMPTY_FORM = {
  name: '', scientificName: '', description: '',
  phMin: '', phMax: '', tempMin: '', tempMax: '',
  tdsMin: '', tdsMax: '', turbidityMax: '',
};

/* ────────────────────────────────────────────────────────────────
   FishCard
   ──────────────────────────────────────────────────────────────── */
function FishCard({ fish, onClick }) {
  const [imgError, setImgError] = useState(false);
  const src = getImageUrl(fish.imageUrl);

  return (
    <div className="fish-card" onClick={() => onClick(fish)} role="button" tabIndex={0}
         onKeyDown={(e) => e.key === 'Enter' && onClick(fish)}>
      <div className="fish-card-img-wrap">
        {src && !imgError
          ? <img className="fish-card-img" src={src} alt={fish.name} loading="lazy"
                 onError={() => setImgError(true)} />
          : <div className="fish-card-img-placeholder">🐠</div>
        }
      </div>
      <div className="fish-card-body">
        <div className="fish-card-name">{fish.name}</div>
        {fish.scientificName && <div className="fish-card-sci">{fish.scientificName}</div>}
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
   AddEditModal — SUPER_ADMIN only
   ──────────────────────────────────────────────────────────────── */
function AddEditModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm]             = useState(initial ? {
    name:           initial.name           ?? '',
    scientificName: initial.scientificName ?? '',
    description:    initial.description    ?? '',
    phMin:    initial.phMin    ?? '',
    phMax:    initial.phMax    ?? '',
    tempMin:  initial.tempMin  ?? '',
    tempMax:  initial.tempMax  ?? '',
    tdsMin:   initial.tdsMin   ?? '',
    tdsMax:   initial.tdsMax   ?? '',
    turbidityMax: initial.turbidityMax ?? '',
  } : { ...EMPTY_FORM });

  const [imageFile,    setImageFile]    = useState(null);     // new File object
  const [previewUrl,   setPreviewUrl]   = useState(          // local preview OR existing URL
    initial?.imageUrl ? getImageUrl(initial.imageUrl) : null
  );
  const [removeImage,  setRemoveImage]  = useState(false);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState('');

  function handleField(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
  }

  function handleRemoveImage() {
    setImageFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Fish name is required.'); return; }
    setBusy(true);
    setError('');
    try {
      let result;
      if (isEdit) {
        result = await fishApi.update(initial.id, form, imageFile, removeImage);
      } else {
        result = await fishApi.create(form, imageFile);
      }
      onSave(result, isEdit);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fish-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fish-modal" role="dialog" aria-modal="true">
        <div className="fish-modal-header">
          <span className="fish-modal-title">{isEdit ? `✏️ Edit: ${initial.name}` : '➕ Add New Species'}</span>
          <button className="fish-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="fish-modal-body">

            {/* Name & Scientific name */}
            <div className="fish-form-row">
              <div className="fish-form-group">
                <label htmlFor="fm-name">Common Name *</label>
                <input id="fm-name" name="name" value={form.name} onChange={handleField}
                       placeholder="e.g. Guppy" required />
              </div>
              <div className="fish-form-group">
                <label htmlFor="fm-sci">Scientific Name</label>
                <input id="fm-sci" name="scientificName" value={form.scientificName}
                       onChange={handleField} placeholder="e.g. Poecilia reticulata" />
              </div>
            </div>

            {/* Description */}
            <div className="fish-form-group">
              <label htmlFor="fm-desc">Description</label>
              <textarea id="fm-desc" name="description" value={form.description}
                        onChange={handleField} placeholder="Care notes, behaviour, habitat…" />
            </div>

            {/* Water parameters */}
            <p className="fish-section-label" style={{ margin: 0 }}>Water Condition Ranges</p>

            <div className="fish-form-row">
              <div className="fish-form-group">
                <label htmlFor="fm-tempMin">🌡 Temp Min (°C)</label>
                <input id="fm-tempMin" name="tempMin" type="number" step="0.1"
                       value={form.tempMin} onChange={handleField} placeholder="e.g. 22" />
              </div>
              <div className="fish-form-group">
                <label htmlFor="fm-tempMax">🌡 Temp Max (°C)</label>
                <input id="fm-tempMax" name="tempMax" type="number" step="0.1"
                       value={form.tempMax} onChange={handleField} placeholder="e.g. 28" />
              </div>
            </div>

            <div className="fish-form-row">
              <div className="fish-form-group">
                <label htmlFor="fm-phMin">⚗ pH Min</label>
                <input id="fm-phMin" name="phMin" type="number" step="0.1"
                       value={form.phMin} onChange={handleField} placeholder="e.g. 6.5" />
              </div>
              <div className="fish-form-group">
                <label htmlFor="fm-phMax">⚗ pH Max</label>
                <input id="fm-phMax" name="phMax" type="number" step="0.1"
                       value={form.phMax} onChange={handleField} placeholder="e.g. 7.5" />
              </div>
            </div>

            <div className="fish-form-row">
              <div className="fish-form-group">
                <label htmlFor="fm-tdsMin">💧 TDS Min (ppm)</label>
                <input id="fm-tdsMin" name="tdsMin" type="number" step="1"
                       value={form.tdsMin} onChange={handleField} placeholder="e.g. 100" />
              </div>
              <div className="fish-form-group">
                <label htmlFor="fm-tdsMax">💧 TDS Max (ppm)</label>
                <input id="fm-tdsMax" name="tdsMax" type="number" step="1"
                       value={form.tdsMax} onChange={handleField} placeholder="e.g. 400" />
              </div>
            </div>

            <div className="fish-form-row">
              <div className="fish-form-group">
                <label htmlFor="fm-turbMax">🌊 Turbidity Max (NTU)</label>
                <input id="fm-turbMax" name="turbidityMax" type="number" step="0.1"
                       value={form.turbidityMax} onChange={handleField} placeholder="e.g. 10" />
              </div>
            </div>

            {/* Image upload */}
            <div className="fish-form-group">
              <label>Fish Photo</label>
              {previewUrl ? (
                <>
                  <img className="fish-upload-preview" src={previewUrl} alt="preview" />
                  <button type="button" className="fish-remove-img-btn" onClick={handleRemoveImage}>
                    ✕ Remove photo
                  </button>
                </>
              ) : (
                <div className="fish-upload-zone">
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                  <div className="fish-upload-icon">📷</div>
                  <div className="fish-upload-label">Click or drag an image here</div>
                  <div className="fish-upload-hint">JPG, PNG, WebP · max 5 MB</div>
                </div>
              )}
            </div>

            {error && <p className="fish-form-error">⚠ {error}</p>}

            <div className="fish-modal-footer">
              <button type="button" className="fish-modal-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="fish-modal-save" disabled={busy}>
                {busy ? '⏳ Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Species'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   FishDetailDrawer
   ──────────────────────────────────────────────────────────────── */
function FishDetailDrawer({ fish, tanks, role, onClose, onEdit, onDelete, onRefreshTanks }) {
  const [selectedTankId, setSelectedTankId] = useState('');
  const [presetBusy, setPresetBusy]         = useState(false);
  const [presetMsg, setPresetMsg]           = useState(null);
  const [bannerError, setBannerError]       = useState(false);
  const [deleting, setDeleting]             = useState(false);

  const src = getImageUrl(fish.imageUrl);

  useEffect(() => {
    setSelectedTankId('');
    setPresetMsg(null);
    setBannerError(false);
  }, [fish?.id]);

  const selectedTank = tanks.find(t => t.deviceId === selectedTankId);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const canPreset    = role === 'ADMIN' && selectedTankId;

  const compatRows = selectedTank ? [
    { 
      label: 'Temperature', 
      icon: '🌡', 
      unit: '',  
      value: selectedTank.thresholds?.tempMin !== undefined 
        ? `${selectedTank.thresholds.tempMin} – ${selectedTank.thresholds.tempMax}°C` 
        : '—',      
      min: fish.tempMin,  
      max: fish.tempMax,      
      range: fmtRange(fish.tempMin, fish.tempMax, '°C'),
      ok: isThresholdCompatible(selectedTank.thresholds?.tempMin, selectedTank.thresholds?.tempMax, fish.tempMin, fish.tempMax)
    },
    { 
      label: 'pH',          
      icon: '⚗', 
      unit: '',     
      value: selectedTank.thresholds?.phMin !== undefined 
        ? `${selectedTank.thresholds.phMin} – ${selectedTank.thresholds.phMax}` 
        : '—',        
      min: fish.phMin,    
      max: fish.phMax,        
      range: fmtRange(fish.phMin, fish.phMax),
      ok: isThresholdCompatible(selectedTank.thresholds?.phMin, selectedTank.thresholds?.phMax, fish.phMin, fish.phMax)
    },
    { 
      label: 'TDS',         
      icon: '💧', 
      unit: '', 
      value: selectedTank.thresholds?.tdsMin !== undefined 
        ? `${selectedTank.thresholds.tdsMin} – ${selectedTank.thresholds.tdsMax} ppm` 
        : '—',       
      min: fish.tdsMin,   
      max: fish.tdsMax,       
      range: fmtRange(fish.tdsMin, fish.tdsMax, ' ppm'),
      ok: isThresholdCompatible(selectedTank.thresholds?.tdsMin, selectedTank.thresholds?.tdsMax, fish.tdsMin, fish.tdsMax)
    },
    { 
      label: 'Turbidity',   
      icon: '🌊', 
      unit: '', 
      value: selectedTank.thresholds?.turbidityMax !== undefined 
        ? `≤ ${selectedTank.thresholds.turbidityMax} NTU` 
        : '—', 
      min: null,          
      max: fish.turbidityMax, 
      range: fish.turbidityMax != null ? `≤ ${fish.turbidityMax} NTU` : '—',
      ok: isMaxThresholdCompatible(selectedTank.thresholds?.turbidityMax, fish.turbidityMax)
    },
  ] : [];

  async function handleApplyPreset() {
    if (!canPreset) return;
    setPresetBusy(true); setPresetMsg(null);
    try {
      const payload = {};
      if (fish.tempMin      != null) payload.tempMin      = fish.tempMin;
      if (fish.tempMax      != null) payload.tempMax      = fish.tempMax;
      if (fish.phMin        != null) payload.phMin        = fish.phMin;
      if (fish.phMax        != null) payload.phMax        = fish.phMax;
      if (fish.tdsMin       != null) payload.tdsMin       = fish.tdsMin;
      if (fish.tdsMax       != null) payload.tdsMax       = fish.tdsMax;
      if (fish.turbidityMax != null) payload.turbidityMax = fish.turbidityMax;
      await deviceApi.updateThresholds(selectedTankId, payload);
      if (onRefreshTanks) {
        await onRefreshTanks();
      }
      setPresetMsg({ type: 'success', text: `Thresholds for "${selectedTank.deviceName || selectedTankId}" updated to match ${fish.name} requirements!` });
    } catch (err) {
      setPresetMsg({ type: 'error', text: err.message || 'Failed to apply preset.' });
    } finally {
      setPresetBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${fish.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fishApi.delete(fish.id);
      onDelete(fish.id);
      onClose();
    } catch (err) {
      alert(err.message || 'Delete failed.');
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="fish-drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="fish-drawer" role="dialog" aria-modal="true" aria-label={`${fish.name} details`}>
        <button className="fish-drawer-close" onClick={onClose} aria-label="Close">×</button>

        {/* Banner */}
        {src && !bannerError
          ? <img className="fish-drawer-banner" src={src} alt={fish.name} onError={() => setBannerError(true)} />
          : <div className="fish-drawer-banner-placeholder">🐠</div>
        }

        <div className="fish-drawer-content">

          {/* Identity */}
          <div>
            <h2 className="fish-drawer-title">{fish.name}</h2>
            {fish.scientificName && <p className="fish-drawer-sci">{fish.scientificName}</p>}
            {fish.description    && <p className="fish-drawer-desc">{fish.description}</p>}
          </div>

          {/* SUPER_ADMIN edit/delete */}
          {isSuperAdmin && (
            <div className="fish-drawer-admin-row">
              <button className="fish-edit-btn" onClick={() => onEdit(fish)}>✏️ Edit</button>
              <button className="fish-delete-btn" onClick={handleDelete} disabled={deleting}>
                {deleting ? '⏳ Deleting…' : '🗑 Delete'}
              </button>
            </div>
          )}

          {/* Water Ranges */}
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
                <div className="fish-range-value">{fish.turbidityMax != null ? `≤ ${fish.turbidityMax}` : '—'}</div>
                <div className="fish-range-unit">NTU</div>
              </div>
            </div>
          </div>

          {/* Compatibility */}
          <div className="fish-compat-section">
            <p className="fish-section-label">Tank Compatibility Checker</p>
            {tanks.length === 0 ? (
              <div className="compat-no-tank">No tanks available to compare.</div>
            ) : (
              <>
                <select id="fish-tank-select" className="fish-compat-select"
                        value={selectedTankId}
                        onChange={(e) => { setSelectedTankId(e.target.value); setPresetMsg(null); }}>
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
                        <th>Parameter</th><th>Tank Value</th><th>Safe Range</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {compatRows.map(row => {
                        const ok = row.ok;
                        return (
                          <tr key={row.label} className={ok === true ? 'compat-ok' : ok === false ? 'compat-bad' : ''}>
                            <td><strong>{row.icon} {row.label}</strong></td>
                            <td>
                              {row.value != null
                                ? `${typeof row.value === 'number' ? row.value.toFixed(1) : row.value}${row.unit}`
                                : <span style={{ color: 'var(--text-muted)' }}>No data</span>}
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
                  <div className="compat-no-tank">Select a tank to see compatibility.</div>
                )}
              </>
            )}
          </div>

          {/* Apply Preset */}
          {role === 'ADMIN' && (
            <div className="fish-preset-section">
              <p className="fish-section-label">Apply as Tank Preset</p>
              <p className="fish-preset-hint">
                Instantly set the selected tank's alert thresholds to match this species'
                recommended water conditions.
              </p>
              <button id="fish-apply-preset-btn" className="fish-preset-btn"
                      onClick={handleApplyPreset} disabled={!selectedTankId || presetBusy}>
                {presetBusy ? '⏳ Applying…' : `🎯 Apply ${fish.name} Preset`}
              </button>
              {presetMsg?.type === 'success' && <p className="fish-preset-success">✓ {presetMsg.text}</p>}
              {presetMsg?.type === 'error'   && <p className="fish-preset-error">⚠ {presetMsg.text}</p>}
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
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const [fishList,  setFishList]  = useState([]);
  const [tanks,     setTanks]     = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [selected,  setSelected]  = useState(null);   // fish in detail drawer
  const [editing,   setEditing]   = useState(null);   // fish in edit modal (null = add new)
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [fl, tl] = await Promise.all([fishApi.list(), deviceApi.list()]);
        if (!cancelled) { setFishList(fl); setTanks(tl); }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load fish data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setSelected(null); setShowModal(false); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const refreshTanks = useCallback(async () => {
    try {
      const tl = await deviceApi.list();
      setTanks(tl);
    } catch (err) {
      console.error('Failed to refresh tanks:', err);
    }
  }, []);

  const filtered = fishList.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) ||
           (f.scientificName && f.scientificName.toLowerCase().includes(q));
  });

  /* ── SUPER_ADMIN actions ── */
  function openAdd() { setEditing(null); setShowModal(true); }
  function openEdit(fish) { setEditing(fish); setShowModal(true); setSelected(null); }

  function handleSaved(updatedFish, isEdit) {
    setFishList(prev =>
      isEdit
        ? prev.map(f => f.id === updatedFish.id ? updatedFish : f)
        : [...prev, updatedFish].sort((a, b) => a.name.localeCompare(b.name))
    );
    setShowModal(false);
    setEditing(null);
  }

  function handleDeleted(id) {
    setFishList(prev => prev.filter(f => f.id !== id));
    setSelected(null);
  }

  if (loading) return <div className="empty-state"><p>Loading fish species…</p></div>;
  if (error)   return <div className="empty-state"><p className="error-msg">{error}</p></div>;

  return (
    <div className="fish-page">

      {/* ── Header ── */}
      <div className="fish-page-header">
        <div>
          <h1 className="fish-page-title">🐠 Fish Info</h1>
          <p className="fish-page-subtitle">
            Browse freshwater species and compare their water needs against your tanks.
          </p>
        </div>

        <div className="fish-admin-actions">
          {/* Search */}
          <div className="fish-search-wrap">
            <span className="fish-search-icon">🔍</span>
            <input id="fish-search-input" className="fish-search" type="text"
                   placeholder="Search species…" value={search}
                   onChange={(e) => setSearch(e.target.value)} aria-label="Search fish species" />
          </div>

          {/* Add button — SUPER_ADMIN only */}
          {isSuperAdmin && (
            <button id="fish-add-btn" className="fish-add-btn" onClick={openAdd}>
              ＋ Add Species
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="fish-empty">
          <div className="fish-empty-icon">{search ? '🔍' : '🐠'}</div>
          <p>{search ? `No species match "${search}".` : 'No species added yet.'}</p>
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
          onEdit={openEdit}
          onDelete={handleDeleted}
          onRefreshTanks={refreshTanks}
        />
      )}

      {/* ── Add / Edit Modal (SUPER_ADMIN) ── */}
      {showModal && (
        <AddEditModal
          initial={editing}
          onSave={handleSaved}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
