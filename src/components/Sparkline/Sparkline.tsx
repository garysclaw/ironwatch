import styles from "./Sparkline.module.css";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({ data, width = 120, height = 40, color = "var(--accent)" }: Props) {
  if (data.length < 2) {
    return (
      <svg
        className={styles.root}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-label="sparkline"
      />
    );
  }

  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  });

  const fillPts = [
    `0,${height}`,
    ...pts,
    `${width},${height}`,
  ].join(" ");

  return (
    <svg
      className={styles.root}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-label="sparkline"
    >
      <polygon points={fillPts} fill={color} opacity={0.15} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
