use serde::{Deserialize, Serialize};
use sysinfo::{
    CpuRefreshKind, Disks, MemoryRefreshKind, Networks, ProcessesToUpdate, RefreshKind, System,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CpuMetrics {
    pub overall_usage: f32,
    pub per_core_usage: Vec<f32>,
    pub frequency_mhz: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoryMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub swap_total_bytes: u64,
    pub swap_used_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiskMetrics {
    pub name: String,
    pub read_bytes_per_sec: u64,
    pub write_bytes_per_sec: u64,
    pub total_bytes: u64,
    pub used_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetworkMetrics {
    pub interface: String,
    pub rx_bytes_per_sec: u64,
    pub tx_bytes_per_sec: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemMetrics {
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub disks: Vec<DiskMetrics>,
    pub networks: Vec<NetworkMetrics>,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub status: String,
}

pub struct MetricsCollector {
    system: System,
    disks: Disks,
    networks: Networks,
}

impl MetricsCollector {
    pub fn new() -> Self {
        let mut system = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );
        // Initial full refresh to populate processes and other data
        system.refresh_all();
        let disks = Disks::new_with_refreshed_list();
        let networks = Networks::new_with_refreshed_list();
        Self { system, disks, networks }
    }

    pub fn refresh(&mut self) {
        self.system.refresh_cpu_usage();
        self.system.refresh_memory();
        self.system.refresh_processes(ProcessesToUpdate::All);
        self.disks.refresh();
        self.networks.refresh();
    }

    pub fn get_system_info(&self) -> crate::SystemInfo {
        let hostname = System::host_name().unwrap_or_else(|| "unknown".to_string());
        let os_name = System::name().unwrap_or_else(|| "Linux".to_string());
        let os_version = System::os_version().unwrap_or_else(|| "unknown".to_string());
        let kernel_version = System::kernel_version().unwrap_or_else(|| "unknown".to_string());
        let cpus = self.system.cpus();
        let cpu_brand = cpus.first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "unknown".to_string());
        let cpu_count = cpus.len();
        crate::SystemInfo {
            hostname,
            os_name,
            os_version,
            kernel_version,
            cpu_brand,
            cpu_count,
        }
    }

    pub fn get_uptime(&self) -> u64 {
        System::uptime()
    }

    pub fn get_metrics(&self) -> SystemMetrics {
        let cpus = self.system.cpus();
        let overall_usage = self.system.global_cpu_usage();
        let per_core_usage: Vec<f32> = cpus.iter().map(|c| c.cpu_usage()).collect();
        let frequency_mhz = cpus.first().map(|c| c.frequency()).filter(|&f| f > 0);

        let cpu = CpuMetrics { overall_usage, per_core_usage, frequency_mhz };

        let memory = MemoryMetrics {
            total_bytes: self.system.total_memory(),
            used_bytes: self.system.used_memory(),
            available_bytes: self.system.available_memory(),
            swap_total_bytes: self.system.total_swap(),
            swap_used_bytes: self.system.used_swap(),
        };

        let disks: Vec<DiskMetrics> = self.disks.iter().map(|d| DiskMetrics {
            name: d.name().to_string_lossy().to_string(),
            read_bytes_per_sec: 0,
            write_bytes_per_sec: 0,
            total_bytes: d.total_space(),
            used_bytes: d.total_space() - d.available_space(),
        }).collect();

        let networks: Vec<NetworkMetrics> = self.networks.iter()
            .filter(|(name, _)| !name.starts_with("lo"))
            .map(|(name, data)| NetworkMetrics {
                interface: name.clone(),
                rx_bytes_per_sec: data.received(),
                tx_bytes_per_sec: data.transmitted(),
            })
            .collect();

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        SystemMetrics { cpu, memory, disks, networks, timestamp }
    }

    pub fn get_processes(&self) -> Vec<ProcessInfo> {
        let mut processes: Vec<ProcessInfo> = self.system.processes()
            .iter()
            .map(|(pid, proc)| ProcessInfo {
                pid: pid.as_u32(),
                name: proc.name().to_string_lossy().to_string(),
                cpu_usage: proc.cpu_usage(),
                memory_bytes: proc.memory(),
                status: format!("{:?}", proc.status()),
            })
            .collect();
        processes.sort_by(|a, b| {
            b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal)
        });
        processes.truncate(20);
        processes
    }
}
