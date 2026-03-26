import { useEffect, useRef, useState } from "react";
import { useMetrics } from "../../contexts/MetricsContext";
import MetricBar from "../MetricBar/MetricBar";
import Sparkline from "../Sparkline/Sparkline";
import styles from "./MemoryPanel.module.css";
import type { MemoryMetrics } from "../../types/metrics";

const MAX_HISTORY = 60;

interface Props {
  memory?: MemoryMetrics;
  history?: number[];
}

function fmt(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GiB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MiB`;
  return `${(bytes / 1024).toFixed(0)} KiB`;
}

export default function MemoryPanel({ memory: memoryProp, history: historyProp }: Props) {
  const { metrics } = useMetrics();
  const memory = memoryProp ?? metrics?.memory;

  const historyRef = useRef<number[]>([]);
  const [internalHistory, setInternalHistory] = useState<number[]>([]);

  useEffect(() => {
    if (historyProp !== undefined || !metrics) return;
    const pct = (metrics.memory.used_bytes / metrics.memory.total_bytes) * 100;
    const next = [...historyRef.current.slice(-(MAX_HISTORY - 1)), pct];
    historyRef.current = next;
    setInternalHistory([...next]);
  }, [metrics?.memory.used_bytes, historyProp]);

  const displayHistory = historyProp ?? internalHistory;

  if (!memory) return null;
  const ramPct = (memory.used_bytes / memory.total_bytes) * 100;
  const swapPct = memory.swap_total_bytes > 0
    ? (memory.swap_used_bytes / memory.swap_total_bytes) * 100
    : 0;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Memory</span>
        <span className={styles.total}>{fmt(memory.total_bytes)}</span>
      </div>
      <MetricBar
        label="RAM"
        value={ramPct}
        detail={`${fmt(memory.used_bytes)} / ${fmt(memory.total_bytes)}`}
      />
      <Sparkline data={displayHistory} width={200} height={28} color="var(--green)" />
      {memory.swap_total_bytes > 0 && (
        <MetricBar
          label="Swap"
          value={swapPct}
          detail={`${fmt(memory.swap_used_bytes)} / ${fmt(memory.swap_total_bytes)}`}
          color="yellow"
        />
      )}
    </div>
  );
}
