import { useEffect, useRef, useState } from "react";
import { useMetrics } from "../../contexts/MetricsContext";
import MetricBar from "../MetricBar/MetricBar";
import Sparkline from "../Sparkline/Sparkline";
import CoreGrid from "./CoreGrid";
import styles from "./CpuPanel.module.css";

const MAX_HISTORY = 60;

export default function CpuPanel() {
  const { metrics } = useMetrics();
  const historyRef = useRef<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!metrics) return;
    const next = [...historyRef.current.slice(-(MAX_HISTORY - 1)), metrics.cpu.overall_usage];
    historyRef.current = next;
    setHistory([...next]);
  }, [metrics?.cpu.overall_usage]);

  if (!metrics) return null;
  const { cpu } = metrics;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>CPU</span>
        <span className={styles.freq}>{cpu.frequency_mhz} MHz</span>
      </div>
      <div className={styles.main}>
        <MetricBar label="Overall" value={cpu.overall_usage} />
        <Sparkline data={history} width={200} height={36} />
      </div>
      <CoreGrid cores={cpu.per_core_usage} />
    </div>
  );
}
