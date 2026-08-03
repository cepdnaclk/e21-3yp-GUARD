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
          : <div className="w-full h-full flex items-center justify-center text-sky-400 select-none"><svg viewBox="0 0 24 24" width="48" height="48" fill="none"><path d="M 4 12 Q 9 7 15 12 Q 19 14 21 12 L 19 16 Q 14 18 4 12 Z M 15 11 A 1 1 0 1 0 15 9" stroke="currentColor" strokeWidth="2"/></svg></div>
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
            <span className="px-2 py-0.5 rounded-full bg-orange-400/12 text-orange-600 dark:text-orange-300 text-[0.72rem] font-semibold border border-orange-400/20 inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 5 A 3 3 0 0 0 9 8 V 14.26 A 5 5 0 1 0 15 14.26 V 8 A 3 3 0 0 0 12 5 Z"/></svg>
              <span>{fmtRange(fish.tempMin, fish.tempMax)}°C</span>
            </span>
          )}
          {fish.phMin != null && (
            <span className="px-2 py-0.5 rounded-full bg-purple-400/12 text-purple-600 dark:text-purple-300 text-[0.72rem] font-semibold border border-purple-400/20 inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 10 2 v 5 L 4 17 a 3 3 0 0 0 3 4 h 10 a 3 3 0 0 0 3 -4 L 14 7 V 2 H 10 Z"/></svg>
              <span>pH {fmtRange(fish.phMin, fish.phMax)}</span>
            </span>
          )}
          {fish.tdsMin != null && (
            <span className="px-2 py-0.5 rounded-full bg-sky-400/12 text-sky-600 dark:text-sky-300 text-[0.72rem] font-semibold border border-sky-400/20 inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 2.69 l 5.66 5.66 a 8 8 0 1 1 -11.31 0 Z"/></svg>
              <span>{fmtRange(fish.tdsMin, fish.tdsMax)} ppm</span>
            </span>
          )}
          {fish.turbidityMax != null && (
            <span className="px-2 py-0.5 rounded-full bg-teal-400/12 text-teal-600 dark:text-teal-300 text-[0.72rem] font-semibold border border-teal-400/20 inline-flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 2 12 Q 6 8 10 12 T 18 12 T 22 12 M 2 17 Q 6 13 10 17 T 18 17 T 22 17"/></svg>
              <span>≤ {fish.turbidityMax} NTU</span>
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
          <span className="font-bold text-[1.05rem] text-text-main dark:text-[#e6edf3] inline-flex items-center gap-1.5">
            {isEdit ? (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 20 h 9 M 16.5 3.5 a 2.121 2.121 0 0 1 3 3 L 7 19 l -4 1 1 -4 Z"/></svg>
                <span>Edit: {initial.name}</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Add New Species</span>
              </>
            )}
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

            <div className={FORM_ROW}>
              <div className={FORM_GROUP}><label htmlFor="fm-tempMin" className={`${FORM_LABEL} inline-flex items-center gap-1`}><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 5 A 3 3 0 0 0 9 8 V 14.26 A 5 5 0 1 0 15 14.26 V 8 A 3 3 0 0 0 12 5 Z"/></svg>Temp Min (°C)</label><input id="fm-tempMin" name="tempMin" type="number" step="0.1" value={form.tempMin} onChange={handleField} placeholder="e.g. 22" className={MODAL_INPUT} /></div>
              <div className={FORM_GROUP}><label htmlFor="fm-tempMax" className={`${FORM_LABEL} inline-flex items-center gap-1`}><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 5 A 3 3 0 0 0 9 8 V 14.26 A 5 5 0 1 0 15 14.26 V 8 A 3 3 0 0 0 12 5 Z"/></svg>Temp Max (°C)</label><input id="fm-tempMax" name="tempMax" type="number" step="0.1" value={form.tempMax} onChange={handleField} placeholder="e.g. 28" className={MODAL_INPUT} /></div>
            </div>
            <div className={FORM_ROW}>
              <div className={FORM_GROUP}><label htmlFor="fm-phMin" className={`${FORM_LABEL} inline-flex items-center gap-1`}><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 10 2 v 5 L 4 17 a 3 3 0 0 0 3 4 h 10 a 3 3 0 0 0 3 -4 L 14 7 V 2 H 10 Z"/></svg>pH Min</label><input id="fm-phMin" name="phMin" type="number" step="0.1" value={form.phMin} onChange={handleField} placeholder="e.g. 6.5" className={MODAL_INPUT} /></div>
              <div className={FORM_GROUP}><label htmlFor="fm-phMax" className={`${FORM_LABEL} inline-flex items-center gap-1`}><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 10 2 v 5 L 4 17 a 3 3 0 0 0 3 4 h 10 a 3 3 0 0 0 3 -4 L 14 7 V 2 H 10 Z"/></svg>pH Max</label><input id="fm-phMax" name="phMax" type="number" step="0.1" value={form.phMax} onChange={handleField} placeholder="e.g. 7.5" className={MODAL_INPUT} /></div>
            </div>
            <div className={FORM_ROW}>
              <div className={FORM_GROUP}><label htmlFor="fm-tdsMin" className={`${FORM_LABEL} inline-flex items-center gap-1`}><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 2.69 l 5.66 5.66 a 8 8 0 1 1 -11.31 0 Z"/></svg>TDS Min (ppm)</label><input id="fm-tdsMin" name="tdsMin" type="number" step="1" value={form.tdsMin} onChange={handleField} placeholder="e.g. 100" className={MODAL_INPUT} /></div>
              <div className={FORM_GROUP}><label htmlFor="fm-tdsMax" className={`${FORM_LABEL} inline-flex items-center gap-1`}><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 2.69 l 5.66 5.66 a 8 8 0 1 1 -11.31 0 Z"/></svg>TDS Max (ppm)</label><input id="fm-tdsMax" name="tdsMax" type="number" step="1" value={form.tdsMax} onChange={handleField} placeholder="e.g. 400" className={MODAL_INPUT} /></div>
            </div>
            <div className={FORM_ROW}>
              <div className={FORM_GROUP}><label htmlFor="fm-turbMax" className={`${FORM_LABEL} inline-flex items-center gap-1`}><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 2 12 Q 6 8 10 12 T 18 12 T 22 12 M 2 17 Q 6 13 10 17 T 18 17 T 22 17"/></svg>Turbidity Max (NTU)</label><input id="fm-turbMax" name="turbidityMax" type="number" step="0.1" value={form.turbidityMax} onChange={handleField} placeholder="e.g. 10" className={MODAL_INPUT} /></div>
            </div>

            {/* Image Upload */}
            <div className={FORM_GROUP}>
              <label className={FORM_LABEL}>Fish Photo</label>
              {previewUrl ? (
                <>
                  <img className="w-full max-h-[180px] object-cover rounded-lg border border-white/20" src={previewUrl} alt="preview" />
                  <button type="button" className="self-start mt-1 text-[0.8rem] font-semibold text-danger bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-400/20 px-3 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors inline-flex items-center gap-1" onClick={handleRemoveImage}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    <span>Remove photo</span>
                  </button>
                </>
              ) : (
                <div className="relative border-2 border-dashed border-white/30 dark:border-white/10 rounded-xl p-8 flex flex-col items-center gap-2 bg-white/10 dark:bg-white/[0.03] hover:border-primary/40 transition-colors cursor-pointer text-slate-400">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <div className="text-[0.9rem] font-semibold text-text-main dark:text-slate-200">Click or drag an image here</div>
                  <div className="text-[0.78rem] text-text-muted">JPG, PNG, WebP · max 5 MB</div>
                </div>
              )}
            </div>

            {error && <p className="text-danger text-[0.85rem] font-semibold flex items-center gap-1"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</p>}
          </div>

          {/* .fish-modal-footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/20 dark:border-white/[0.08]">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary inline-flex items-center gap-1.5" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  <span>Save Changes</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Add Species</span>
                </>
              )}
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
    { label: 'Temperature', icon: 'temp', value: selectedTank.thresholds?.tempMin !== undefined ? `${selectedTank.thresholds.tempMin} – ${selectedTank.thresholds.tempMax}°C` : '—', range: fmtRange(fish.tempMin, fish.tempMax, '°C'), ok: isThresholdCompatible(selectedTank.thresholds?.tempMin, selectedTank.thresholds?.tempMax, fish.tempMin, fish.tempMax) },
    { label: 'pH',          icon: 'ph',   value: selectedTank.thresholds?.phMin !== undefined ? `${selectedTank.thresholds.phMin} – ${selectedTank.thresholds.phMax}` : '—', range: fmtRange(fish.phMin, fish.phMax), ok: isThresholdCompatible(selectedTank.thresholds?.phMin, selectedTank.thresholds?.phMax, fish.phMin, fish.phMax) },
    { label: 'TDS',         icon: 'tds',  value: selectedTank.thresholds?.tdsMin !== undefined ? `${selectedTank.thresholds.tdsMin} – ${selectedTank.thresholds.tdsMax} ppm` : '—', range: fmtRange(fish.tdsMin, fish.tdsMax, ' ppm'), ok: isThresholdCompatible(selectedTank.thresholds?.tdsMin, selectedTank.thresholds?.tdsMax, fish.tdsMin, fish.tdsMax) },
    { label: 'Turbidity',   icon: 'turb', value: selectedTank.thresholds?.turbidityMax !== undefined ? `≤ ${selectedTank.thresholds.turbidityMax} NTU` : '—', range: fish.turbidityMax != null ? `≤ ${fish.turbidityMax} NTU` : '—', ok: isMaxThresholdCompatible(selectedTank.thresholds?.turbidityMax, fish.turbidityMax) },
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
          : <div className="w-full h-[220px] bg-gradient-to-br from-sky-100 to-blue-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-sky-400 flex-shrink-0"><svg viewBox="0 0 24 24" width="64" height="64" fill="none"><path d="M 4 12 Q 9 7 15 12 Q 19 14 21 12 L 19 16 Q 14 18 4 12 Z M 15 11 A 1 1 0 1 0 15 9" stroke="currentColor" strokeWidth="2"/></svg></div>
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
              <button className="btn btn-primary btn-sm flex-1 inline-flex items-center justify-center gap-1" onClick={() => onEdit(fish)}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 20 h 9 M 16.5 3.5 a 2.121 2.121 0 0 1 3 3 L 7 19 l -4 1 1 -4 Z"/></svg>
                <span>Edit</span>
              </button>
              <button className="btn btn-sm flex-1 bg-red-500/10 dark:bg-red-400/10 text-danger border border-red-400/30 hover:bg-red-500/20 transition-colors inline-flex items-center justify-center gap-1" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Saving…' : (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Water Ranges Grid */}
          <div>
            <p className={SECTION_LABEL}>Recommended Water Conditions</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'temp', label: 'Temperature', value: fmtRange(fish.tempMin, fish.tempMax), unit: '°C' },
                { type: 'ph',   label: 'pH Level',    value: fmtRange(fish.phMin,  fish.phMax),   unit: 'pH units' },
                { type: 'tds',  label: 'TDS',          value: fmtRange(fish.tdsMin, fish.tdsMax),  unit: 'ppm' },
                { type: 'turb', label: 'Turbidity',    value: fish.turbidityMax != null ? `≤ ${fish.turbidityMax}` : '—', unit: 'NTU' },
              ].map(({ type, label, value, unit }) => (
                <div key={label} className={`rounded-xl p-3.5 border border-white/20 dark:border-white/[0.06] flex flex-col gap-1 ${type === 'temp' ? 'bg-orange-400/10 text-orange-600 dark:text-orange-300' : type === 'ph' ? 'bg-purple-400/10 text-purple-600 dark:text-purple-300' : type === 'tds' ? 'bg-sky-400/10 text-sky-600 dark:text-sky-300' : 'bg-teal-400/10 text-teal-600 dark:text-teal-300'}`}>
                  <div className="text-[1.1rem]">
                    {type === 'temp' && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 5 A 3 3 0 0 0 9 8 V 14.26 A 5 5 0 1 0 15 14.26 V 8 A 3 3 0 0 0 12 5 Z"/></svg>}
                    {type === 'ph'   && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 10 2 v 5 L 4 17 a 3 3 0 0 0 3 4 h 10 a 3 3 0 0 0 3 -4 L 14 7 V 2 H 10 Z"/></svg>}
                    {type === 'tds'  && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 2.69 l 5.66 5.66 a 8 8 0 1 1 -11.31 0 Z"/></svg>}
                    {type === 'turb' && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 2 12 Q 6 8 10 12 T 18 12 T 22 12 M 2 17 Q 6 13 10 17 T 18 17 T 22 17"/></svg>}
                  </div>
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
                            <td className="px-3 py-2 font-semibold">
                              <span className="inline-flex items-center gap-1.5">
                                {row.icon === 'temp' && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 5 A 3 3 0 0 0 9 8 V 14.26 A 5 5 0 1 0 15 14.26 V 8 A 3 3 0 0 0 12 5 Z"/></svg>}
                                {row.icon === 'ph'   && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 10 2 v 5 L 4 17 a 3 3 0 0 0 3 4 h 10 a 3 3 0 0 0 3 -4 L 14 7 V 2 H 10 Z"/></svg>}
                                {row.icon === 'tds'  && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 12 2.69 l 5.66 5.66 a 8 8 0 1 1 -11.31 0 Z"/></svg>}
                                {row.icon === 'turb' && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M 2 12 Q 6 8 10 12 T 18 12 T 22 12 M 2 17 Q 6 13 10 17 T 18 17 T 22 17"/></svg>}
                                <span>{row.label}</span>
                              </span>
                            </td>
                            <td className="px-3 py-2">{row.value}</td>
                            <td className="px-3 py-2 text-text-muted dark:text-slate-400">{row.range}</td>
                            <td className="px-3 py-2 text-center">
                              {row.ok === true  && <span className="text-success font-bold inline-flex items-center" title="Within safe range"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>}
                              {row.ok === false && <span className="text-danger font-bold inline-flex items-center" title="Outside safe range"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>}
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
                {presetBusy ? 'Applying…' : (
                  <span className="inline-flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    <span>Apply {fish.name} Preset</span>
                  </span>
                )}
              </button>
              {presetMsg?.type === 'success' && <p className="text-success text-[0.85rem] font-semibold m-0 flex items-center gap-1"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{presetMsg.text}</p>}
              {presetMsg?.type === 'error'   && <p className="text-danger  text-[0.85rem] font-semibold m-0 flex items-center gap-1"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{presetMsg.text}</p>}
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none inline-flex items-center">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              id="fish-search-input"
              className="w-full pl-9 pr-4 py-[0.6rem] border-[1.5px] border-white/20 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.05] backdrop-blur-sm rounded-[10px] text-[0.9rem] text-text-main dark:text-[#e6edf3] outline-none focus:border-primary transition-all"
              type="text" placeholder="Search species…" value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search fish species"
            />
          </div>

          {isSuperAdmin && (
            <button id="fish-add-btn" className="btn btn-primary inline-flex items-center gap-1.5" onClick={openAdd}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add Species</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-text-muted">
          <div className="text-sky-400 mb-4">
            {search ? (
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M 4 12 Q 9 7 15 12 Q 19 14 21 12 L 19 16 Q 14 18 4 12 Z M 15 11 A 1 1 0 1 0 15 9"/></svg>
            )}
          </div>
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
