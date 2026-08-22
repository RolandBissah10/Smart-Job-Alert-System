/** Vertical bar chart - magnitude, one hue. Each bar shows a floating tooltip
 * on hover/focus (keyboard-reachable via tabIndex) with the exact value. */
export default function BarChart({ data, color = 'var(--primary)', emptyMessage = 'Not enough data yet.' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="chart-empty">{emptyMessage}</p>;
  }

  return (
    <div className="bar-chart">
      {data.map((d) => {
        const pct = Math.max(2, Math.round((d.value / max) * 100));
        return (
          <div key={d.label} className="bar-chart-col" tabIndex={0}>
            <div className="bar-chart-track">
              <div className="bar-chart-fill" style={{ height: `${pct}%`, background: color }}>
                <span className="chart-tooltip">{d.label}: {d.value}</span>
                {pct > 30 && <span className="bar-chart-value">{d.value}</span>}
              </div>
            </div>
            <span className="bar-chart-label">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
