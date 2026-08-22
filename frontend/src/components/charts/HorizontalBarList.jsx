/** Horizontal ranked bar list - used both for a plain one-hue magnitude
 * ranking (pass `color`) and an ordinal ramp where each row's shade reinforces
 * its position in a fixed sequence (pass `colors`, one per row, in order).
 * Each row shows a floating tooltip on hover/focus with the exact value. */
export default function HorizontalBarList({ data, color = 'var(--primary)', colors, emptyMessage = 'Not enough data yet.' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="chart-empty">{emptyMessage}</p>;
  }

  return (
    <div className="hbar-list">
      {data.map((d, i) => {
        const pct = Math.max(3, Math.round((d.value / max) * 100));
        const barColor = colors ? colors[i % colors.length] : color;
        return (
          <div key={d.label} className="hbar-row" tabIndex={0}>
            <span className="hbar-label">{d.label}</span>
            <div className="hbar-track">
              <div className="hbar-fill" style={{ width: `${pct}%`, background: barColor }}>
                <span className="chart-tooltip chart-tooltip-right">{d.label}: {d.value}</span>
              </div>
            </div>
            <span className="hbar-value">{d.value}</span>
          </div>
        );
      })}
    </div>
  );
}
