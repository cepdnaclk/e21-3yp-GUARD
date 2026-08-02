import { useState, useEffect, useRef, useCallback } from 'react';
import { fishApi, deviceApi, getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
// fish-info.css migrated to Tailwind below.

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

/* ── Shared class constants ──────────────────────────────────── */
const MODAL_INPUT = 'w-full px-3 py-[0.7rem] border-[1.5px] border-white/20 dark:border-white/[0.08] bg-white/30 dark:bg-white/[0.05] rounded-lg text-[0.9rem] text-text-main dark:text-[#e6edf3] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
const SECTION_LABEL = 'text-[0.75rem] font-bold uppercase tracking-[0.8px] text-text-muted dark:text-slate-400 mb-3';

/* ────────────────────────────────────────────────────────────────
   FishCard
   ──────────────────────────────────────────────────────────────── */
function FishCard({ fish, onClick }) {
  const [imgError, setImgError] = useState(false);
  const src = getImageUrl(fish.imageUrl);

  return (
    /* .fish-card */
    <div
      className="bg-white/72 dark:bg-[rgba(8,15,26,0.88)] backdrop-blur-xl rounded-2xl border border-white/60 dark:border-white/[0.08] shadow-[0_4px_20px_rgba(14,52,84,0.10)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.40)] overflow-hidden cursor-pointer transition-all duration-[220ms] hover:-translate-y-1.5 hover:shadow-[0_12px_36px_rgba(14,52,84,0.18)] hover:border-primary/30 dark:hover:border-primary/25 flex flex-col"
      onClick={() => onClick(fish)} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(fish)}
    >
      {/* .fish-card-img-wrap */}
      <div className="w-full h-[160px] bg-gradient-to-br from-sky-100 to-blue-50 dark:from-slate-800 dark:to-slate-900 overflow-hidden flex-shrink-0">
        {src && !imgError
          ? <img className="w-full h-full object-cover transition-transform duration-[400ms] hover:scale-105" src={src} alt={fish.name} loading="lazy" onError={() => setImgError(true)} />
          : <div className="w-full h-full flex items-center justify-center text-[3.5rem] select-none">🐠</div>
        }
      </div>
      {/* .fish-card-body */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <div className="font-bold text-[1rem] text-text-main dark:text-[#e6edf3] leading-snug">{fish.name}</div>
        {fish.scientificName && (
          <div className="text-[0.78rem] italic text-text-muted dark:text-slate-400">{fish.scientificName}</div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {fish.tempMin != null && (
            <span className="px-2 py-0.5 rounded-full bg-orange-400/12 text-orange-600 dark:text-orange-300 text-[0.72rem] font-semibold border border-orange-400/20">
              🌡 {fmtRange(fish.tempMin, fish.tempMax)}°C
            </span>
          )}
          {fish.phMin != null && (
            <span className="px-2 py-0.5 rounded-full bg-purple-400/12 text-purple-600 dark:text-purple-300 text-[0.72rem] font-semibold border border-purple-400/20">
              ⚗ pH {fmtRange(fish.phMin, fish.phMax)}
            </span>
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
  const [form, setForm] = useState(initial ? {
    name:           initial.name           ?? '',
    scientificName: initial.scientificName ?? '',
    description:    initial.description    ?? '',
    phMin:    initial.phMin    ?? '', phMax:    initial.phMax    ?? '',
    tempMin:  initial.tempMin  ?? '', tempMax:  initial.tempMax  ?? '',
    tdsMin:   initial.tdsMin   ?? '', tdsMax:   initial.tdsMax   ?? '',
    turbidityMax: initial.turbidityMax ?? '',
  } : { ...EMPTY_FORM });

  const [imageFile,   setImageFile]   = useState(null);
  const [previewUrl,  setPreviewUrl]  = useState(initial?.imageUrl ? getImageUrl(initial.imageUrl) : null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState('');

  function handleField(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
  }

  function handleRemoveImage() { setImageFile(null); setPreviewUrl(null); setRemoveImage(true); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Fish name is required.'); return; }
    setBusy(true); setError('');
    try {
      const result = isEdit
        ? await fishApi.update(initial.id, form, imageFile, removeImage)
        : await fishApi.create(form, imageFile);
      onSave(result, isEdit);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  const FORM_ROW = 'grid grid-cols-2 gap-4';
  const FORM_GROUP = 'flex flex-col gap-1.5';
  const FORM_LABEL = 'text-[0.8rem] font-semibold text-text-muted dark:text-slate-400';

  return (
    /* .fish-modal-overlay */
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* .fish-modal */}
      <div className="bg-white/90 dark:bg-[rgba(13,20,35,0.96)] backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.40)] w-full max-w-[680px] max-h-[90vh] flex flex-col" role="dialog" aria-modal="true">
        {/* .fish-modal-header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-white/[0.08]">
          <span className="font-bold text-[1.05rem] text-text-main dark:text-[#e6edf3]">
            {isEdit ? `✏️ Edit: ${initial.name}` : '➕ Add New Species'}
          </span>
          <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/[0.08] text-text-muted dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/[0.14] text-xl leading-none transition-colors" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* .fish-modal-body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

            <div className={FORM_ROW}>
              <div className={FORM_GROUP}>
                <label htmlFor="fm-name" className={FORM_LABEL}>Common Name *</label>
                <input id="fm-name" name="name" value={form.name} onChange={handleField} placeholder="e.g. Guppy" required className={MODAL_INPUT} />
              </div>
              <div className={FORM_GROUP}>
                <label htmlFor="fm-sci" className={FORM_LABEL}>Scientific Name</label>
                <input id="fm-sci" name="scientificName" value={form.scientificName} onChange={handleField} placeholder="e.g. Poecilia reticulata" className={MODAL_INPUT} />
              </div>
            </div>

            <div className={FORM_GROUP}>
              <label htmlFor="fm-desc" className={FORM_LABEL}>Description</label>
              <textarea id="fm-desc" name="description" value={form.description} onChange={handleField} placeholder="Care notes, behaviour, habitat…" rows={3} className={`${MODAL_INPUT} resize-y`} />
            </div>

            <p className={SECTION_LABEL} style={{ margin: 0 }}>Water Condition Ranges</p>

            {[['tempMin','🌡 Temp Min (°C)','fm-tempMin','0.1','e.g. 22'],['tempMax','🌡 Temp Max (°C)','fm-tempMax','0.1','e.g. 28']].map(([name, label, id, step, ph]) => null) /* rendered below */}

            <div className={FORM_ROW}>
              <div className={FORM_GROUP}><label htmlFor="fm-tempMin" className={FORM_LABEL}>🌡 Temp Min (°C)</label><input id="fm-tempMin" name="tempMin" type="number" step="0.1" value={form.tempMin} onChange={handleField} placeholder="e.g. 22" className={MODAL_INPUT} /></div>
              <div className={FORM_GROUP}><label htmlFor="fm-tempMax" className={FORM_LABEL}>🌡 Temp Max (°C)</label><input id="fm-tempMax" name="tempMax" type="number" step="0.1" value={form.tempMax} onChange={handleField} placeholder="e.g. 28" className={MODAL_INPUT} /></div>
            </div>
            <div className={FORM_ROW}>
              <div className={FORM_GROUP}><label htmlFor="fm-phMin" className={FORM_LABEL}>⚗ pH Min</label><input id="fm-phMin" name="phMin" type="number" step="0.1" value={form.phMin} onChange={handleField} placeholder="e.g. 6.5" className={MODAL_INPUT} /></div>
              <div className={FORM_GROUP}><label htmlFor="fm-phMax" className={FORM_LABEL}>⚗ pH Max</label><input id="fm-phMax" name="phMax" type="number" step="0.1" value={form.phMax} onChange={handleField} placeholder="e.g. 7.5" className={MODAL_INPUT} /></div>
            </div>
            <div className={FORM_ROW}>
              <div className={FORM_GROUP}><label htmlFor="fm-tdsMin" className={FORM_LABEL}>💧 TDS Min (ppm)</label><input id="fm-tdsMin" name="tdsMin" type="number" step="1" value={form.tdsMin} onChange={handleField} placeholder="e.g. 100" className={MODAL_INPUT} /></div>
              <div className={FORM_GROUP}><label htmlFor="fm-tdsMax" className={FORM_LABEL}>💧 TDS Max (ppm)</label><input id="fm-tdsMax" name="tdsMax" type="number" step="1" value={form.tdsMax} onChange={handleField} placeholder="e.g. 400" className={MODAL_INPUT} /></div>
            </div>
            <div className={FORM_ROW}>
              <div className={FORM_GROUP}><label htmlFor="fm-turbMax" className={FORM_LABEL}>🌊 Turbidity Max (NTU)</label><input id="fm-turbMax" name="turbidityMax" type="number" step="0.1" value={form.turbidityMax} onChange={handleField} placeholder="e.g. 10" className={MODAL_INPUT} /></div>
            </div>

            {/* Image Upload */}
            <div className={FORM_GROUP}>
              <label className={FORM_LABEL}>Fish Photo</label>
              {previewUrl ? (
                <>
                  <img className="w-full max-h-[180px] object-cover rounded-lg border border-white/20" src={previewUrl} alt="preview" />
                  <button type="button" className="self-start mt-1 text-[0.8rem] font-semibold text-danger bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-400/20 px-3 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" onClick={handleRemoveImage}>✕ Remove photo</button>
                </>
              ) : (
                <div className="relative border-2 border-dashed border-white/30 dark:border-white/10 rounded-xl p-8 flex flex-col items-center gap-2 bg-white/10 dark:bg-white/[0.03] hover:border-primary/40 transition-colors cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="text-[2rem]">📷</div>
                  <div className="text-[0.9rem] font-semibold text-text-main dark:text-slate-200">Click or drag an image here</div>
                  <div className="text-[0.78rem] text-text-muted">JPG, PNG, WebP · max 5 MB</div>
                </div>
              )}
            </div>

            {error && <p className="text-danger text-[0.85rem] font-semibold">⚠ {error}</p>}
          </div>

          {/* .fish-modal-footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/20 dark:border-white/[0.08]">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? '⏳ Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Species'}
            </button>
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
  const [presetMsg,  setPresetMsg]          = useState(null);
  const [bannerError, setBannerError]       = useState(false);
  const [deleting,   setDeleting]           = useState(false);

  const src = getImageUrl(fish.imageUrl);

  useEffect(() => { setSelectedTankId(''); setPresetMsg(null); setBannerError(false); }, [fish?.id]);

  const selectedTank = tanks.find(t => t.deviceId === selectedTankId);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const canPreset    = role === 'ADMIN' && selectedTankId;

  const compatRows = selectedTank ? [
    { label: 'Temperature', icon: '🌡', value: selectedTank.thresholds?.tempMin !== undefined ? `${selectedTank.thresholds.tempMin} – ${selectedTank.thresholds.tempMax}°C` : '—', range: fmtRange(fish.tempMin, fish.tempMax, '°C'), ok: isThresholdCompatible(selectedTank.thresholds?.tempMin, selectedTank.thresholds?.tempMax, fish.tempMin, fish.tempMax) },
    { label: 'pH',          icon: '⚗', value: selectedTank.thresholds?.phMin !== undefined ? `${selectedTank.thresholds.phMin} – ${selectedTank.thresholds.phMax}` : '—', range: fmtRange(fish.phMin, fish.phMax), ok: isThresholdCompatible(selectedTank.thresholds?.phMin, selectedTank.thresholds?.phMax, fish.phMin, fish.phMax) },
    { label: 'TDS',         icon: '💧', value: selectedTank.thresholds?.tdsMin !== undefined ? `${selectedTank.thresholds.tdsMin} – ${selectedTank.thresholds.tdsMax} ppm` : '—', range: fmtRange(fish.tdsMin, fish.tdsMax, ' ppm'), ok: isThresholdCompatible(selectedTank.thresholds?.tdsMin, selectedTank.thresholds?.tdsMax, fish.tdsMin, fish.tdsMax) },
    { label: 'Turbidity',   icon: '🌊', value: selectedTank.thresholds?.turbidityMax !== undefined ? `≤ ${selectedTank.thresholds.turbidityMax} NTU` : '—', range: fish.turbidityMax != null ? `≤ ${fish.turbidityMax} NTU` : '—', ok: isMaxThresholdCompatible(selectedTank.thresholds?.turbidityMax, fish.turbidityMax) },
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
      if (onRefreshTanks) await onRefreshTanks();
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
      onDelete(fish.id); onClose();
    } catch (err) {
      alert(err.message || 'Delete failed.');
      setDeleting(false);
    }
  }

  /* Range cards colour mapping */
  const RANGE_CARD_COLORS = {
    '🌡': 'bg-orange-400/10 dark:bg-orange-400/8 text-orange-600 dark:text-orange-300',
    '⚗':  'bg-purple-400/10 dark:bg-purple-400/8 text-purple-600 dark:text-purple-300',
    '💧': 'bg-sky-400/10 dark:bg-sky-400/8 text-sky-600 dark:text-sky-300',
    '🌊': 'bg-teal-400/10 dark:bg-teal-400/8 text-teal-600 dark:text-teal-300',
  };

  return (
    <>
      {/* .fish-drawer-overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]" onClick={onClose} aria-hidden="true" />
      {/* .fish-drawer */}
      <aside className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-white/95 dark:bg-[rgba(10,16,28,0.98)] backdrop-blur-2xl border-l border-white/30 dark:border-white/[0.08] shadow-[−32px_0_80px_rgba(0,0,0,0.30)] z-[110] flex flex-col overflow-y-auto" role="dialog" aria-modal="true" aria-label={`${fish.name} details`}>

        <button className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/8 dark:bg-white/[0.08] text-text-muted hover:bg-black/14 dark:hover:bg-white/[0.15] text-[1.4rem] leading-none transition-colors z-10" onClick={onClose} aria-label="Close">×</button>

        {/* Banner */}
        {src && !bannerError
          ? <img className="w-full h-[220px] object-cover flex-shrink-0" src={src} alt={fish.name} onError={() => setBannerError(true)} />
          : <div className="w-full h-[220px] bg-gradient-to-br from-sky-100 to-blue-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-[5rem] flex-shrink-0">🐠</div>
        }

        <div className="flex flex-col gap-6 p-6">
          {/* Identity */}
          <div>
            <h2 className="text-[1.5rem] font-bold text-text-main dark:text-[#e6edf3] m-0 mb-1">{fish.name}</h2>
            {fish.scientificName && <p className="text-[0.85rem] italic text-text-muted dark:text-slate-400 m-0 mb-2">{fish.scientificName}</p>}
            {fish.description    && <p className="text-[0.9rem] text-text-main dark:text-slate-300 m-0 leading-relaxed">{fish.description}</p>}
          </div>

          {/* SUPER_ADMIN edit/delete */}
          {isSuperAdmin && (
            <div className="flex gap-3">
              <button className="btn btn-primary btn-sm flex-1" onClick={() => onEdit(fish)}>✏️ Edit</button>
              <button className="btn btn-sm flex-1 bg-red-500/10 dark:bg-red-400/10 text-danger border border-red-400/30 hover:bg-red-500/20 transition-colors" onClick={handleDelete} disabled={deleting}>
                {deleting ? '⏳ Deleting…' : '🗑 Delete'}
              </button>
            </div>
          )}

          {/* Water Ranges Grid */}
          <div>
            <p className={SECTION_LABEL}>Recommended Water Conditions</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🌡', label: 'Temperature', value: fmtRange(fish.tempMin, fish.tempMax), unit: '°C' },
                { icon: '⚗',  label: 'pH Level',    value: fmtRange(fish.phMin,  fish.phMax),   unit: 'pH units' },
                { icon: '💧', label: 'TDS',          value: fmtRange(fish.tdsMin, fish.tdsMax),  unit: 'ppm' },
                { icon: '🌊', label: 'Turbidity',    value: fish.turbidityMax != null ? `≤ ${fish.turbidityMax}` : '—', unit: 'NTU' },
              ].map(({ icon, label, value, unit }) => (
                <div key={label} className={`rounded-xl p-3.5 border border-white/20 dark:border-white/[0.06] flex flex-col gap-1 ${RANGE_CARD_COLORS[icon] || ''}`}>
                  <div className="text-[1.3rem]">{icon}</div>
                  <div className="text-[0.7rem] uppercase tracking-[0.6px] font-bold opacity-70">{label}</div>
                  <div className="text-[1.05rem] font-bold">{value}</div>
                  <div className="text-[0.7rem] opacity-60">{unit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Compatibility */}
          <div>
            <p className={SECTION_LABEL}>Tank Compatibility Checker</p>
            {tanks.length === 0 ? (
              <div className="text-text-muted text-[0.85rem] py-3">No tanks available to compare.</div>
            ) : (
              <>
                <select
                  id="fish-tank-select"
                  className="w-full px-3 py-[0.7rem] border-[1.5px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-[0.9rem] text-slate-800 dark:text-slate-100 outline-none focus:border-primary mb-3 cursor-pointer shadow-sm"
                  value={selectedTankId}
                  onChange={(e) => { setSelectedTankId(e.target.value); setPresetMsg(null); }}
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                    — Select a tank to compare —
                  </option>
                  {tanks.map(t => (
                    <option key={t.deviceId} value={t.deviceId} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                      {t.deviceName || t.deviceId} ({t.deviceId})
                    </option>
                  ))}
                </select>

                {selectedTank ? (
                  <div className="overflow-x-auto rounded-xl border border-white/20 dark:border-white/[0.06]">
                    <table className="w-full border-collapse text-[0.85rem]">
                      <thead className="bg-sky-400/6 dark:bg-white/[0.04]">
                        <tr>
                          {['Parameter','Tank Value','Safe Range',''].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[0.72rem] uppercase tracking-[0.5px] font-bold text-text-muted dark:text-slate-400 border-b border-white/10">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compatRows.map(row => (
                          <tr key={row.label} className={`border-b border-white/[0.06] ${row.ok === true ? 'bg-green-500/5' : row.ok === false ? 'bg-red-500/5' : ''}`}>
                            <td className="px-3 py-2 font-semibold"><strong>{row.icon} {row.label}</strong></td>
                            <td className="px-3 py-2">{row.value}</td>
                            <td className="px-3 py-2 text-text-muted dark:text-slate-400">{row.range}</td>
                            <td className="px-3 py-2 text-center">
                              {row.ok === true  && <span className="text-success font-bold text-base" title="Within safe range">✓</span>}
                              {row.ok === false && <span className="text-danger font-bold text-base" title="Outside safe range">✗</span>}
                              {row.ok === null  && <span className="text-text-muted">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-text-muted text-[0.85rem] py-2">Select a tank to see compatibility.</div>
                )}
              </>
            )}
          </div>

          {/* Apply Preset */}
          {role === 'ADMIN' && (
            <div className="bg-primary/5 dark:bg-primary/[0.08] border border-primary/20 rounded-xl p-5 flex flex-col gap-3">
              <p className={SECTION_LABEL}>Apply as Tank Preset</p>
              <p className="text-[0.85rem] text-text-muted dark:text-slate-400 m-0">
                Instantly set the selected tank's alert thresholds to match this species' recommended water conditions.
              </p>
              <button
                id="fish-apply-preset-btn"
                className="btn btn-primary self-start"
                onClick={handleApplyPreset}
                disabled={!selectedTankId || presetBusy}
              >
                {presetBusy ? '⏳ Applying…' : `🎯 Apply ${fish.name} Preset`}
              </button>
              {presetMsg?.type === 'success' && <p className="text-success text-[0.85rem] font-semibold m-0">✓ {presetMsg.text}</p>}
              {presetMsg?.type === 'error'   && <p className="text-danger  text-[0.85rem] font-semibold m-0">⚠ {presetMsg.text}</p>}
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
  const [selected,  setSelected]  = useState(null);
  const [editing,   setEditing]   = useState(null);
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
    try { const tl = await deviceApi.list(); setTanks(tl); } catch (err) { console.error('Failed to refresh tanks:', err); }
  }, []);

  const filtered = fishList.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || (f.scientificName && f.scientificName.toLowerCase().includes(q));
  });

  function openAdd() { setEditing(null); setShowModal(true); }
  function openEdit(fish) { setEditing(fish); setShowModal(true); setSelected(null); }

  function handleSaved(updatedFish, isEdit) {
    setFishList(prev =>
      isEdit
        ? prev.map(f => f.id === updatedFish.id ? updatedFish : f)
        : [...prev, updatedFish].sort((a, b) => a.name.localeCompare(b.name))
    );
    setShowModal(false); setEditing(null);
  }

  function handleDeleted(id) { setFishList(prev => prev.filter(f => f.id !== id)); setSelected(null); }

  if (loading) return <div className="empty-state"><p>Loading fish species…</p></div>;
  if (error)   return <div className="empty-state"><p className="error-msg">{error}</p></div>;

  return (
    /* .fish-page */
    <div className="pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-end flex-wrap gap-4 mb-7">
        <div className="flex items-center gap-3 flex-wrap ml-auto">
          {/* Search */}
          <div className="relative min-w-[260px] max-w-[340px] flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.9rem] text-text-muted pointer-events-none">🔍</span>
            <input
              id="fish-search-input"
              className="w-full pl-8 pr-4 py-[0.6rem] border-[1.5px] border-white/20 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.05] backdrop-blur-sm rounded-[10px] text-[0.9rem] text-text-main dark:text-[#e6edf3] outline-none focus:border-primary transition-all"
              type="text" placeholder="Search species…" value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search fish species"
            />
          </div>

          {isSuperAdmin && (
            <button id="fish-add-btn" className="btn btn-primary" onClick={openAdd}>
              ＋ Add Species
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-text-muted">
          <div className="text-[3rem] mb-4">{search ? '🔍' : '🐠'}</div>
          <p>{search ? `No species match "${search}".` : 'No species added yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5" id="fish-grid">
          {filtered.map(f => <FishCard key={f.id} fish={f} onClick={setSelected} />)}
        </div>
      )}

      {/* ── Detail Drawer ── */}
      {selected && (
        <FishDetailDrawer
          fish={selected} tanks={tanks} role={role}
          onClose={() => setSelected(null)}
          onEdit={openEdit} onDelete={handleDeleted} onRefreshTanks={refreshTanks}
        />
      )}

      {/* ── Add / Edit Modal (SUPER_ADMIN) ── */}
      {showModal && (
        <AddEditModal
          initial={editing} onSave={handleSaved}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
