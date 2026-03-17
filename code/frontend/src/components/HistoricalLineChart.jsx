function formatTick(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRange(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '';
  if (min === max) return String(min);
  return `${min.toFixed(2)} - ${max.toFixed(2)}`;
}

export default function HistoricalLineChart({ title, points, color = '#0ea5e9' }) {
  if (!points?.length) return null;

  const width = 860;
  const height = 260;
  const padding = { top: 16, right: 16, bottom: 34, left: 48 };
  const minVal = Math.min(...points.map((p) => p.value));
  const maxVal = Math.max(...points.map((p) => p.value));
  const adjustedMin = minVal === maxVal ? minVal - 1 : minVal;
  const adjustedMax = minVal === maxVal ? maxVal + 1 : maxVal;

  const xScale = (idx) => {
    if (points.length === 1) return (width - padding.left - padding.right) / 2 + padding.left;
    const innerW = width - padding.left - padding.right;
    return padding.left + (idx / (points.length - 1)) * innerW;
  };

  const yScale = (value) => {
    const innerH = height - padding.top - padding.bottom;
    const ratio = (value - adjustedMin) / (adjustedMax - adjustedMin);
    return height - padding.bottom - ratio * innerH;
  };

  const path = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(idx).toFixed(2)} ${yScale(p.value).toFixed(2)}`)
    .join(' ');

  const axisY = [0, 0.5, 1].map((ratio) => {
    const value = adjustedMin + (adjustedMax - adjustedMin) * ratio;
    const y = yScale(value);
    return { value, y };
  });

  const tickIndexes = points.length <= 6
    ? points.map((_, i) => i)
    : [0, Math.floor(points.length * 0.25), Math.floor(points.length * 0.5), Math.floor(points.length * 0.75), points.length - 1];

  return (
    <div className="history-chart-card">
      <div className="history-chart-header">
        <h4>{title}</h4>
        <span>Range: {formatRange(minVal, maxVal)}</span>
      </div>

      <div className="history-chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} line chart`}>
          {axisY.map((tick) => (
            <g key={tick.y}>
              <line x1={padding.left} y1={tick.y} x2={width - padding.right} y2={tick.y} className="history-grid-line" />
              <text x={padding.left - 8} y={tick.y + 4} textAnchor="end" className="history-axis-text">
                {tick.value.toFixed(2)}
              </text>
            </g>
          ))}

          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="history-axis-line" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="history-axis-line" />

          <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, idx) => (
            <circle key={`${p.readingTime}-${idx}`} cx={xScale(idx)} cy={yScale(p.value)} r="2.5" fill={color} />
          ))}

          {tickIndexes.map((idx) => (
            <text
              key={`x-${idx}`}
              x={xScale(idx)}
              y={height - 10}
              textAnchor="middle"
              className="history-axis-text"
            >
              {formatTick(points[idx].readingTime)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}