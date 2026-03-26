import { createContext, useContext } from "react";
import type { ProcessInfo } from "../types/metrics";

interface ProcessesContextValue {
  processes: ProcessInfo[];
}

export const ProcessesContext = createContext<ProcessesContextValue>({
  processes: [],
});

export function useProcesses() {
  return useContext(ProcessesContext);
}
