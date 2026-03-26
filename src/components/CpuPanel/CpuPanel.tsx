import { useEffect, useRef, useState } from "react";
import { useMetrics } from "../../contexts/MetricsContext";
import Sparkline from "../Sparkline/Sparkline";
import CoreGrid from "./CoreGrid";
import styles from "./CpuPanel.module.css";
import type { CpuMetrics } from "../../types/metrics";

const MAX_HISTORY = 60;

interface Props {
  cpu?: CpuMetrics;
  history?: number[];
}

export default function CpuPanel({ cpu: cpuProp, history: historyProp }: Props) {
  const { metrics } = useMetrics();
  const cpu = cpuProp ?? metrics?.cpu;

  const historyRef = useRef<number[]>([]);
  const [internalHistory, setInternalHistory] = useState<number[]>([]);

  useEffect(() => {
    // Only run internal history tracking when not given history as a prop
    if (historyProp !== undefined || !metrics) return;
    const next = [...historyRef.current.slice(-(MAX_HISTORY - 1)), metrics.cpu.overall_usage];
    historyRef.current = next;
    setInternalHistory([...next]);
  }, [metrics?.cpu.overall_usage, historyProp]);

  const displayHistory = historyProp ?? internalHistory;

  if (!cpu) return null;

  const freqLabel = cpu.frequency_mhz != null ? `${cpu.frequency_mhz} MHz` : "N/A";

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>CPU</span>
        <span className={styles.freq}>{freqLabel}</span>
      </div>
      <div className={styles.main}>
        <div className={styles.overall}>
          <div className={styles.overallRow}>
            <span className={styles.overallLabel}>Overall</span>
            <span className={styles.overallPct}>{cpu.overall_usage.toFixed(1)}%</span>
          </div>
          <div className={styles.overallTrack}>
            <div
              className={styles.overallFill}
              style={{ width: `${Math.min(100, cpu.overall_usage)}%` }}
              role="progressbar"
              aria-valuenow={cpu.overall_usage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
        <Sparkline data={displayHistory} width={200} height={36} />
      </div>
      <CoreGrid cores={cpu.per_core_usage} />
    </div>
  );
}
