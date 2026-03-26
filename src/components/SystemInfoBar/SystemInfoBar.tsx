import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useMetrics } from "../../contexts/MetricsContext";
import styles from "./SystemInfoBar.module.css";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SystemInfoBar() {
  const { systemInfo } = useMetrics();
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const tick = () => {
      invoke<number>("get_uptime").then(setUptime).catch(console.error);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.bar}>
      <span className={styles.brand}>⚡ IRONWATCH</span>
      {systemInfo && (
        <>
          <span className={styles.item}>{systemInfo.hostname}</span>
          <span className={styles.sep}>·</span>
          <span className={styles.item}>{systemInfo.os_name} {systemInfo.os_version}</span>
          <span className={styles.sep}>·</span>
          <span className={styles.item}>{systemInfo.cpu_brand}</span>
          <span className={styles.sep}>·</span>
          <span className={styles.item}>{systemInfo.cpu_count} cores</span>
        </>
      )}
      <span className={styles.spacer} />
      <span className={styles.uptime}>up {formatUptime(uptime)}</span>
    </div>
  );
}
