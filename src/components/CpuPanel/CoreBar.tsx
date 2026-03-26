import styles from "./CpuPanel.module.css";

interface Props {
  index: number;
  usage: number;
}

function getColor(v: number) {
  if (v >= 90) return "var(--red)";
  if (v >= 70) return "var(--yellow)";
  return "var(--accent)";
}

export default function CoreBar({ index, usage }: Props) {
  const pct = Math.min(100, Math.max(0, usage));
  return (
    <div className={styles.coreBar}>
      <div className={styles.coreLabel}>C{index}</div>
      <div className={styles.coreTrack}>
        <div
          className={styles.coreFill}
          style={{ width: `${pct}%`, background: getColor(pct) }}
        />
      </div>
      <div className={styles.coreVal}>{pct.toFixed(0)}%</div>
    </div>
  );
}
