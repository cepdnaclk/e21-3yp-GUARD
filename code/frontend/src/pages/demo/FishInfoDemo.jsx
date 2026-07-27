import { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import '../../styles/fish-info.css';

function fmtRange(min, max, unit = '') {
  if (min == null && max == null) return '—';
  if (min == null) return `≤ ${max}${unit}`;
  if (max == null) return `≥ ${min}${unit}`;
  return `${min} – ${max}${unit}`;
}

function FishCard({ fish, onClick }) {
  return (
    <div
      className="fish-card"
      onClick={() => onClick(fish)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(fish)}
    >
      <div className="fish-card-img-wrap">
        <div className="fish-card-img-placeholder">🐠</div>
      </div>
      <div className="fish-card-body">
        <div className="fish-card-name">{fish.name}</div>
        <div className="fish-card-sci">{fish.scientificName}</div>
      </div>
    </div>
  );
}

function FishDetailPanel({ fish, onClose }) {
  if (!fish) return null;
  return (
    <div className="fish-detail-overlay" onClick={onClose}>
      <div className="fish-detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="fish-detail-close" onClick={onClose}>✕</button>
        <div className="fish-detail-img-wrap">
          <div className="fish-card-img-placeholder" style={{ fontSize: '4rem' }}>🐠</div>
        </div>
        <h2 className="fish-detail-name">{fish.name}</h2>
        <p className="fish-detail-sci">{fish.scientificName}</p>
        <p className="fish-detail-desc">{fish.description}</p>
        <div className="fish-detail-params">
          <div className="param-row">
            <span className="param-label">pH Range</span>
            <span className="param-value">{fmtRange(fish.phMin, fish.phMax)}</span>
          </div>
          <div className="param-row">
            <span className="param-label">Temperature</span>
            <span className="param-value">{fmtRange(fish.tempMin, fish.tempMax, '°C')}</span>
          </div>
          <div className="param-row">
            <span className="param-label">TDS</span>
            <span className="param-value">{fmtRange(fish.tdsMin, fish.tdsMax, ' ppm')}</span>
          </div>
          <div className="param-row">
            <span className="param-label">Max Turbidity</span>
            <span className="param-value">{fish.turbidityMax != null ? `${fish.turbidityMax} NTU` : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FishInfoDemo() {
  const { demoFish } = useDemo();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = demoFish.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fish-info-page" id="fish-page">
      <div className="fish-info-header">
        <h1 className="fish-info-title">Fish Species Library</h1>
        <input
          className="fish-search-input"
          type="text"
          placeholder="Search species..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="fish-grid">
        {filtered.map(f => (
          <FishCard key={f.id} fish={f} onClick={setSelected} />
        ))}
      </div>

      {selected && (
        <FishDetailPanel fish={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
