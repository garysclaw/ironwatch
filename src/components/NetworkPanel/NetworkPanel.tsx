import { useMetrics } from "../../contexts/MetricsContext";
import styles from "./NetworkPanel.module.css";

function fmtRate(bps: number): string {
  if (bps >= 1_048_576) return `${(bps / 1_048_576).toFixed(2)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${bps} B/s`;
}

export default function NetworkPanel() {
  const { metrics } = useMetrics();
  if (!metrics) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Network</span>
      </div>
      <div className={styles.list}>
        {metrics.networks.map((net, i) => (
          <div key={i} className={styles.netRow}>
            <span className={styles.iface}>{net.interface}</span>
            <div className={styles.rates}>
              <span className={styles.rx}>↓ {fmtRate(net.rx_bytes_per_sec)}</span>
              <span className={styles.tx}>↑ {fmtRate(net.tx_bytes_per_sec)}</span>
            </div>
          </div>
        ))}
        {metrics.networks.length === 0 && (
          <div className={styles.empty}>No network interfaces</div>
        )}
      </div>
    </div>
  );
}
