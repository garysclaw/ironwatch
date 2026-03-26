import { useState } from "react";
import { useProcesses } from "../../contexts/ProcessesContext";
import ProcessRow from "./ProcessRow";
import styles from "./ProcessTable.module.css";
import type { ProcessEntry } from "../../types/metrics";

type SortKey = keyof Pick<ProcessEntry, "name" | "cpu_usage" | "memory_bytes" | "pid">;

interface Props {
  processes?: ProcessEntry[];
}

export default function ProcessTable({ processes: processesProp }: Props) {
  const { processes: contextProcesses } = useProcesses();
  const processes = processesProp ?? contextProcesses;

  const [sortKey, setSortKey] = useState<SortKey>("cpu_usage");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...processes].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "string"
      ? av.localeCompare(bv as string)
      : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  function SortHeader({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    return (
      <th
        className={`${styles.th} ${active ? styles.thActive : ""}`}
        onClick={() => handleSort(k)}
      >
        {label} {active ? (sortAsc ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Processes</span>
        <span className={styles.count}>{processes.length} shown</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <SortHeader k="pid" label="PID" />
              <SortHeader k="name" label="Name" />
              <th className={styles.th}>CPU %</th>
              <SortHeader k="memory_bytes" label="Memory" />
              <th className={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((proc) => (
              <ProcessRow key={proc.pid} process={proc} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
