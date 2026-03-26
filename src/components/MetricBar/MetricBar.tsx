import styles from "./MetricBar.module.css";

interface Props {
  label?: string;
  value: number;
  max?: number;
  unit?: string;
  detail?: string;
  color?: "accent" | "green" | "yellow" | "red";
}

function getColor(pct: number): string {
  if (pct >= 80) return "var(--red)";
  if (pct >= 60) return "var(--yellow)";
  return "var(--green)";
}

export default function MetricBar({ label, value, max = 100, unit = "%", detail, color }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color ? `var(--${color})` : getColor(pct);
  const displayValue = pct % 1 === 0 ? `${pct}${unit}` : `${pct.toFixed(1)}${unit}`;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        {label && <span className={styles.label}>{label}</span>}
        <span className={styles.value}>{displayValue}</span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          data-testid="metric-bar-fill"
          style={{ width: `${pct}%`, background: barColor }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
      {detail && <div className={styles.detail}>{detail}</div>}
    </div>
  );
}
