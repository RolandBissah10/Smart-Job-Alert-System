/** Vertical bar chart - magnitude, one hue. Native `title` attributes carry
 * the exact value on hover/focus/screen-reader instead of a custom tooltip
 * widget (a lightweight, accessible way to satisfy "hover by default" here). */
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
          <div key={d.label} className="bar-chart-col" title={`${d.label}: ${d.value}`}>
            <div className="bar-chart-track">
              <div className="bar-chart-fill" style={{ height: `${pct}%`, background: color }}>
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
