const GRID_LINES = [25, 50, 75];

/** Vertical bar chart - magnitude, one hue (or a sequential ramp via `colors`
 * for ordered buckets). Hairline reference gridlines sit behind the bars,
 * each bar has a subtle top-to-base gradient for depth, and shows a floating
 * tooltip on hover/focus (keyboard-reachable via tabIndex) with the exact
 * value. */
export default function BarChart({ data, color = 'var(--primary)', colors, emptyMessage = 'Not enough data yet.' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="chart-empty">{emptyMessage}</p>;
  }

  return (
    <div className="bar-chart-plot">
      {GRID_LINES.map((g) => (
        <div key={g} className="bar-chart-grid" style={{ bottom: `${g}%` }} />
      ))}
      <div className="bar-chart">
        {data.map((d, i) => {
          const pct = Math.max(2, Math.round((d.value / max) * 100));
          const barColor = colors ? colors[i % colors.length] : color;
          return (
            <div key={d.label} className="bar-chart-col" tabIndex={0}>
              <div className="bar-chart-track">
                <div
                  className="bar-chart-fill"
                  style={{
                    height: `${pct}%`,
                    background: `linear-gradient(180deg, color-mix(in srgb, ${barColor} 55%, white) 0%, ${barColor} 100%)`,
                    boxShadow: `0 6px 14px -8px color-mix(in srgb, ${barColor} 60%, transparent)`,
                  }}
                >
                  <span className="chart-tooltip">{d.label}: {d.value}</span>
                  {pct > 30 && <span className="bar-chart-value">{d.value}</span>}
                </div>
              </div>
              <span className="bar-chart-label">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
