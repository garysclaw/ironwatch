import { useMetrics } from "../../contexts/MetricsContext";
import styles from "./DiskPanel.module.css";

function fmt(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function fmtRate(bps: number): string {
  if (bps >= 1_048_576) return `${(bps / 1_048_576).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${bps} B/s`;
}

export default function DiskPanel() {
  const { metrics } = useMetrics();
  if (!metrics) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Disks</span>
      </div>
      <div className={styles.list}>
        {metrics.disks.map((disk, i) => {
          const usedPct = (disk.used_bytes / disk.total_bytes) * 100;
          return (
            <div key={i} className={styles.diskRow}>
              <div className={styles.diskTop}>
                <span className={styles.diskName}>{disk.name}</span>
                <span className={styles.diskSize}>{fmt(disk.total_bytes)}</span>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${usedPct}%` }} />
              </div>
              <div className={styles.diskStats}>
                <span className={styles.stat}>
                  <span className={styles.statLabel}>Used</span>
                  {fmt(disk.used_bytes)} ({usedPct.toFixed(0)}%)
                </span>
                <span className={styles.io}>
                  ↑{fmtRate(disk.write_bytes_per_sec)} ↓{fmtRate(disk.read_bytes_per_sec)}
                </span>
              </div>
            </div>
          );
        })}
        {metrics.disks.length === 0 && (
          <div className={styles.empty}>No disks detected</div>
        )}
      </div>
    </div>
  );
}
