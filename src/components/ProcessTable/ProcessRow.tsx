import type { ProcessInfo } from "../../types/metrics";
import styles from "./ProcessTable.module.css";

interface Props {
  process: ProcessInfo;
}

function fmtMem(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GiB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

export default function ProcessRow({ process }: Props) {
  return (
    <tr className={styles.row}>
      <td className={styles.td}>{process.pid}</td>
      <td className={`${styles.td} ${styles.name}`}>{process.name}</td>
      <td className={styles.td}>
        <span style={{ color: process.cpu_usage > 50 ? "var(--red)" : process.cpu_usage > 20 ? "var(--yellow)" : "var(--text)" }}>
          {process.cpu_usage.toFixed(1)}%
        </span>
      </td>
      <td className={styles.td}>{fmtMem(process.memory_bytes)}</td>
      <td className={styles.td}>{process.status}</td>
    </tr>
  );
}
