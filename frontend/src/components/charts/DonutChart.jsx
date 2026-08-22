import { useState } from 'react';

const SIZE = 200;
const CENTER = SIZE / 2;
const R_MID = 70;
const RING_WIDTH = 40;
const GAP_DEG = 3;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** A single open arc along the ring's midline - rendered as a thick stroke
 * with round caps, so each segment reads as a rounded pill rather than a
 * hard-cornered wedge. */
function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** Part-to-whole donut with a thick, rounded-cap ring - a 3deg surface gap
 * separates touching segments, center text reveals the hovered/focused
 * segment's exact value, defaulting to the total. The legend pairs each
 * label with its own mini percentage bar instead of a plain swatch, so
 * proportions are readable without relying on hue alone. */
export default function DonutChart({ data, colors, emptyMessage = 'Not enough data yet.' }) {
  const [active, setActive] = useState(null);
  const present = data.filter((d) => d.value > 0);
  const total = present.reduce((sum, d) => sum + d.value, 0);

  if (!total) {
    return <p className="chart-empty">{emptyMessage}</p>;
  }

  let angle = 0;
  const segments = present.map((d, i) => {
    const sweep = (d.value / total) * 360;
    const start = angle + (sweep > GAP_DEG ? GAP_DEG / 2 : 0);
    const end = angle + sweep - (sweep > GAP_DEG ? GAP_DEG / 2 : 0);
    angle += sweep;
    return { ...d, start, end, pct: Math.round((d.value / total) * 100), color: colors[i % colors.length] };
  });

  const centerValue = active !== null ? segments[active].value : total;
  const centerLabel = active !== null ? segments[active].label : 'Total';

  return (
    <div className="donut-chart-wrapper">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="donut-chart-svg">
        {segments.map((s, i) => (
          <path
            key={s.label}
            d={arcPath(CENTER, CENTER, R_MID, s.start, s.end)}
            stroke={s.color}
            strokeWidth={RING_WIDTH}
            strokeLinecap="round"
            fill="none"
            className="donut-chart-segment"
            style={{ opacity: active === null || active === i ? 1 : 0.35 }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            tabIndex={0}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}
        <text x={CENTER} y={CENTER - 6} textAnchor="middle" className="donut-chart-center-value">
          {centerValue}
        </text>
        <text x={CENTER} y={CENTER + 16} textAnchor="middle" className="donut-chart-center-label">
          {centerLabel}
        </text>
      </svg>
      <div className="donut-chart-legend">
        {segments.map((s, i) => (
          <div
            key={s.label}
            className={`donut-legend-item ${active === i ? 'active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <div className="donut-legend-row">
              <span className="donut-legend-label">{s.label}</span>
              <span className="donut-legend-value">{s.value} · {s.pct}%</span>
            </div>
            <div className="donut-legend-track">
              <div className="donut-legend-fill" style={{ width: `${s.pct}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
