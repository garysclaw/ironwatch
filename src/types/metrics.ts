export interface CpuMetrics {
  overall_usage: number;       // 0-100
  per_core_usage: number[];    // 0-100 each
  frequency_mhz: number | null; // null if not available on this hardware
}
export interface MemoryMetrics {
  total_bytes: number;
  used_bytes: number;
  available_bytes?: number;
  swap_total_bytes: number;
  swap_used_bytes: number;
}
export interface DiskMetrics {
  name: string;
  read_bytes_per_sec: number;
  write_bytes_per_sec: number;
  total_bytes: number;
  used_bytes: number;
}
export interface NetworkMetrics {
  interface: string;
  rx_bytes_per_sec: number;
  tx_bytes_per_sec: number;
}
export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disks: DiskMetrics[];
  networks: NetworkMetrics[];
  timestamp: number;
}
/** ProcessInfo is the runtime name; ProcessEntry is the alias used in tests/props */
export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_usage: number;
  memory_bytes: number;
  status: string;
}
export type ProcessEntry = ProcessInfo;

export interface SystemInfo {
  hostname: string;
  os_name: string;
  os_version: string;
  kernel_version: string;
  cpu_brand: string;
  cpu_count: number;
}
