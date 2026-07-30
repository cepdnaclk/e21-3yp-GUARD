import { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import '../../styles/fish-info.css';

import carpImg from '../../assets/fish/carp.png';
import catfishImg from '../../assets/fish/catfish.png';
import dwarfGouramiImg from '../../assets/fish/dwarf-gourami.png';
import giantGouramiImg from '../../assets/fish/giant-gourami.png';
import arowanaImg from '../../assets/fish/arowana.png';
import tigerBarbImg from '../../assets/fish/tiger-barb.png';
import rainbowSharkImg from '../../assets/fish/rainbow-shark.png';
import oscarImg from '../../assets/fish/oscar.png';
import tilapiaImg from '../../assets/fish/tilapia.png';
import koiImg from '../../assets/fish/koi.png';
import guppyImg from '../../assets/fish/guppy.png';
import bettaImg from '../../assets/fish/betta.png';
import mollyImg from '../../assets/fish/molly.png';

const LOCAL_FISH_IMAGES = {
  '/uploads/fish/carp.png': carpImg,
  '/uploads/fish/catfish.png': catfishImg,
  '/uploads/fish/dwarf-gourami.png': dwarfGouramiImg,
  '/uploads/fish/giant-gourami.png': giantGouramiImg,
  '/uploads/fish/arowana.png': arowanaImg,
  '/uploads/fish/tiger-barb.png': tigerBarbImg,
  '/uploads/fish/rainbow-shark.png': rainbowSharkImg,
  '/uploads/fish/oscar.png': oscarImg,
  '/uploads/fish/tilapia.png': tilapiaImg,
  '/uploads/fish/koi.png': koiImg,
  '/uploads/fish/guppy.png': guppyImg,
  '/uploads/fish/betta.png': bettaImg,
  '/uploads/fish/molly.png': mollyImg,
};

function resolveFishImage(url) {
  if (!url) return null;
  return LOCAL_FISH_IMAGES[url] || url;
}

function fmtRange(min, max, unit = '') {
  if (min == null && max == null) return '—';
  if (min == null) return `≤ ${max}${unit}`;
  if (max == null) return `≥ ${min}${unit}`;
  return `${min} – ${max}${unit}`;
}

function FishCard({ fish, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const src = resolveFishImage(fish.imageUrl);

  return (
    <div
      className="fish-card"
      onClick={() => onClick(fish)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(fish)}
    >
      <div className="fish-card-img-wrap">
        {src && !imgErr ? (
          <img src={src} alt={fish.name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="fish-card-img-placeholder">🐠</div>
        )}
      </div>
      <div className="fish-card-body">
        <div className="fish-card-name">{fish.name}</div>
        <div className="fish-card-sci">{fish.scientificName}</div>
      </div>
    </div>
  );
}

function FishDetailPanel({ fish, onClose }) {
  const [imgErr, setImgErr] = useState(false);
  if (!fish) return null;
  const src = resolveFishImage(fish.imageUrl);
  return (
    <div className="fish-detail-overlay" onClick={onClose}>
      <div className="fish-detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="fish-detail-close" onClick={onClose}>✕</button>
        <div className="fish-detail-img-wrap">
          {src && !imgErr ? (
            <img src={src} alt={fish.name} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div className="fish-card-img-placeholder" style={{ fontSize: '4rem' }}>🐠</div>
          )}
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
      <div className="fish-info-header" style={{ justifyContent: 'flex-end' }}>
        <input
          className="fish-search-input"
          type="text"
          placeholder="Search species..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="fish-grid" id="fish-grid">
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
