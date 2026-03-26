import styles from "./MetricBar.module.css";

interface Props {
  label: string;
  value: number;      // 0-100
  unit?: string;
  detail?: string;
  color?: "accent" | "green" | "yellow" | "red";
}

function getColor(value: number): string {
  if (value >= 90) return "var(--red)";
  if (value >= 70) return "var(--yellow)";
  return "var(--green)";
}

export default function MetricBar({ label, value, unit = "%", detail, color }: Props) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = color ? `var(--${color})` : getColor(pct);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{pct.toFixed(1)}{unit}</span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
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
