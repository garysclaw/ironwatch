import { createContext, useContext } from "react";
import type { SystemMetrics, SystemInfo } from "../types/metrics";

interface MetricsContextValue {
  metrics: SystemMetrics | null;
  systemInfo: SystemInfo | null;
}

export const MetricsContext = createContext<MetricsContextValue>({
  metrics: null,
  systemInfo: null,
});

export function useMetrics() {
  return useContext(MetricsContext);
}
