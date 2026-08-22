import { useState } from 'react';

const WIDTH = 600;
const HEIGHT = 200;
const PAD_TOP = 16;
const PAD_BOTTOM = 8;

/** Catmull-Rom-style cardinal spline through the points, expressed as cubic
 * bezier segments - a smooth trend line without overshooting between points. */
function buildSmoothPath(points) {
  if (points.length < 2) return '';
  const d = [`M ${points[0].x},${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`);
  }
  return d.join(' ');
}

export default function LineChart({ data, color = 'var(--primary)', emptyMessage = 'Not enough data yet.' }) {
  const [hovered, setHovered] = useState(null);
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="chart-empty">{emptyMessage}</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.value));
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const points = data.map((d, i) => ({
    ...d,
    x: data.length === 1 ? WIDTH / 2 : (i / (data.length - 1)) * WIDTH,
    y: PAD_TOP + innerHeight - (d.value / max) * innerHeight,
  }));
  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x},${PAD_TOP + innerHeight} L ${points[0].x},${PAD_TOP + innerHeight} Z`;
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="line-chart-wrapper">
      <div className="line-chart-plot">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="line-chart-svg">
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1={0}
              x2={WIDTH}
              y1={PAD_TOP + innerHeight * f}
              y2={PAD_TOP + innerHeight * f}
              className="line-chart-grid"
            />
          ))}
          <path d={areaPath} fill={color} opacity="0.1" stroke="none" />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 6 : 4}
              fill={color}
              stroke="var(--background)"
              strokeWidth="2"
              className="line-chart-marker"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              tabIndex={0}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            />
          ))}
        </svg>
        {hovered !== null && (
          <div
            className="line-chart-tooltip"
            style={{
              left: `${(points[hovered].x / WIDTH) * 100}%`,
              top: `${(points[hovered].y / HEIGHT) * 100}%`,
            }}
          >
            {points[hovered].label}: {points[hovered].value}
          </div>
        )}
      </div>
      <div className="line-chart-labels">
        {data.map((d, i) => (
          <span key={i} className="line-chart-label">
            {i % labelStep === 0 || i === data.length - 1 ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
