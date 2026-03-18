type MetricTone = "positive" | "negative" | "neutral" | "info";

export function MetricCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: MetricTone }) {
  return (
    <div className={`metricCard metricCard--${tone}`}>
      <div className="metricLabel">{label}</div>
      <div className="metricValue">{value}</div>
    </div>
  );
}
