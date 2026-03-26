import CoreBar from "./CoreBar";
import styles from "./CpuPanel.module.css";

interface Props {
  cores: number[];
}

export default function CoreGrid({ cores }: Props) {
  return (
    <div className={styles.coreGrid}>
      {cores.map((usage, i) => (
        <CoreBar key={i} index={i} usage={usage} />
      ))}
    </div>
  );
}
