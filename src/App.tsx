import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { MetricsContext } from "./contexts/MetricsContext";
import { ProcessesContext } from "./contexts/ProcessesContext";
import Dashboard from "./components/Dashboard/Dashboard";
import type { SystemMetrics, ProcessInfo, SystemInfo } from "./types/metrics";

function App() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    invoke<SystemInfo>("get_system_info").then(setSystemInfo).catch(console.error);

    const unlistenMetrics = listen<SystemMetrics>("metrics-update", (event) => {
      setMetrics(event.payload);
    });

    const unlistenProcesses = listen<ProcessInfo[]>("processes-update", (event) => {
      setProcesses(event.payload);
    });

    return () => {
      unlistenMetrics.then((f) => f());
      unlistenProcesses.then((f) => f());
    };
  }, []);

  return (
    <MetricsContext.Provider value={{ metrics, systemInfo }}>
      <ProcessesContext.Provider value={{ processes }}>
        <Dashboard />
      </ProcessesContext.Provider>
    </MetricsContext.Provider>
  );
}

export default App;
