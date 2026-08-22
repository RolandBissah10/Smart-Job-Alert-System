import { useState } from 'react';

const SIZE = 200;
const CENTER = SIZE / 2;
const R_OUTER = 90;
const R_INNER = 56;
const GAP_DEG = 2.5;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, startAngle);
  const endInner = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** Part-to-whole donut - a 2deg surface gap separates touching segments (the
 * same spacer role a stacked bar's gap plays), center text reveals the
 * hovered/focused segment's exact value, defaulting to the total. */
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
    return { ...d, start, end, color: colors[i % colors.length] };
  });

  const centerValue = active !== null ? segments[active].value : total;
  const centerLabel = active !== null ? segments[active].label : 'Total';

  return (
    <div className="donut-chart-wrapper">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="donut-chart-svg">
        {segments.map((s, i) => (
          <path
            key={s.label}
            d={arcPath(CENTER, CENTER, R_OUTER, R_INNER, s.start, s.end)}
            fill={s.color}
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
            <span className="donut-legend-swatch" style={{ background: s.color }} />
            <span className="donut-legend-label">{s.label}</span>
            <span className="donut-legend-value">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
