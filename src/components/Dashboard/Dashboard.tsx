import { useMetrics } from "../../contexts/MetricsContext";
import SystemInfoBar from "../SystemInfoBar/SystemInfoBar";
import CpuPanel from "../CpuPanel/CpuPanel";
import MemoryPanel from "../MemoryPanel/MemoryPanel";
import DiskPanel from "../DiskPanel/DiskPanel";
import NetworkPanel from "../NetworkPanel/NetworkPanel";
import ProcessTable from "../ProcessTable/ProcessTable";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { metrics } = useMetrics();

  if (!metrics) {
    return (
      <div className={styles.loading}>
        <span>Connecting to system metrics…</span>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <SystemInfoBar />
      <div className={styles.grid}>
        <div className={styles.col}>
          <CpuPanel />
          <MemoryPanel />
        </div>
        <div className={styles.col}>
          <DiskPanel />
          <NetworkPanel />
        </div>
        <div className={styles.colWide}>
          <ProcessTable />
        </div>
      </div>
    </div>
  );
}
