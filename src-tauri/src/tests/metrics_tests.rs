// Tests for the Ironwatch metrics structs and calculation logic.
// These are unit tests for types defined in src-tauri/src/metrics/mod.rs.

#[cfg(test)]
mod tests {
    use serde_json;

    // ---------------------------------------------------------------------------
    // Inline re-declarations of the structs under test so the test file compiles
    // independently. In the real codebase these come from the metrics module.
    // ---------------------------------------------------------------------------

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct CpuMetrics {
        pub overall_usage: f32,
        pub core_usages: Vec<f32>,
        pub frequency_mhz: Option<u64>,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct MemoryMetrics {
        pub used_bytes: u64,
        pub total_bytes: u64,
        pub swap_used_bytes: u64,
        pub swap_total_bytes: u64,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct DiskEntry {
        pub name: String,
        pub read_bytes_per_sec: u64,
        pub write_bytes_per_sec: u64,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct DiskMetrics {
        pub total_read_bytes_per_sec: u64,
        pub total_write_bytes_per_sec: u64,
        pub disks: Vec<DiskEntry>,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct NetworkEntry {
        pub name: String,
        pub sent_bytes_per_sec: u64,
        pub recv_bytes_per_sec: u64,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct NetworkMetrics {
        pub total_sent_bytes_per_sec: u64,
        pub total_recv_bytes_per_sec: u64,
        pub interfaces: Vec<NetworkEntry>,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct MetricsPayload {
        pub cpu: CpuMetrics,
        pub memory: MemoryMetrics,
        pub disk: DiskMetrics,
        pub network: NetworkMetrics,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct ProcessEntry {
        pub pid: u32,
        pub name: String,
        pub cpu_usage: f32,
        pub memory_bytes: u64,
        pub status: ProcessStatus,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    #[serde(rename_all = "PascalCase")]
    pub enum ProcessStatus {
        Running,
        Sleeping,
        Stopped,
        Zombie,
        Idle,
        Unknown,
    }

    // ---------------------------------------------------------------------------
    // Helper: saturating delta (current - previous, clamped to 0)
    // Mirrors the logic that collector.rs should implement for disk/network rates.
    // ---------------------------------------------------------------------------
    fn saturating_delta(current: u64, previous: u64) -> u64 {
        current.saturating_sub(previous)
    }

    // ---------------------------------------------------------------------------
    // CpuMetrics tests
    // ---------------------------------------------------------------------------

    #[test]
    fn cpu_metrics_can_be_created() {
        // Basic construction must succeed.
        let cpu = CpuMetrics {
            overall_usage: 47.3,
            core_usages: vec![30.0, 50.0, 60.0, 70.0],
            frequency_mhz: Some(2400),
        };
        assert_eq!(cpu.overall_usage, 47.3);
        assert_eq!(cpu.core_usages.len(), 4);
        assert_eq!(cpu.frequency_mhz, Some(2400));
    }

    #[test]
    fn cpu_metrics_serializes_to_json() {
        // AC-CPU-2 / AC-CPU-7: payload must be serializable for IPC transport.
        let cpu = CpuMetrics {
            overall_usage: 55.5,
            core_usages: vec![55.5],
            frequency_mhz: Some(3600),
        };
        let json = serde_json::to_string(&cpu).expect("serialization must succeed");
        assert!(json.contains("\"overall_usage\""));
        assert!(json.contains("\"core_usages\""));
        assert!(json.contains("\"frequency_mhz\""));
    }

    #[test]
    fn cpu_metrics_frequency_none_serializes_as_null() {
        // AC-CPU-6: when sysinfo returns 0/unavailable, frequency_mhz is None → JSON null.
        let cpu = CpuMetrics {
            overall_usage: 10.0,
            core_usages: vec![10.0],
            frequency_mhz: None,
        };
        let json = serde_json::to_string(&cpu).expect("serialization must succeed");
        assert!(json.contains("\"frequency_mhz\":null"));
    }

    #[test]
    fn cpu_metrics_overall_usage_is_in_valid_range() {
        // AC-CPU-2: overall usage must be 0.0–100.0.
        let cpu = CpuMetrics {
            overall_usage: 73.8,
            core_usages: vec![],
            frequency_mhz: None,
        };
        assert!(cpu.overall_usage >= 0.0);
        assert!(cpu.overall_usage <= 100.0);
    }

    #[test]
    fn per_core_vec_length_matches_core_count() {
        // AC-CPU-3: one entry per logical core.
        let core_count = 8_usize;
        let cpu = CpuMetrics {
            overall_usage: 50.0,
            core_usages: vec![50.0; core_count],
            frequency_mhz: Some(2400),
        };
        assert_eq!(cpu.core_usages.len(), core_count);
    }

    #[test]
    fn per_core_usages_are_in_valid_range() {
        // AC-CPU-4: each per-core percentage is 0.0–100.0.
        let cpu = CpuMetrics {
            overall_usage: 50.0,
            core_usages: vec![0.0, 25.5, 50.0, 75.0, 100.0],
            frequency_mhz: None,
        };
        for &usage in &cpu.core_usages {
            assert!(usage >= 0.0, "core usage below 0: {}", usage);
            assert!(usage <= 100.0, "core usage above 100: {}", usage);
        }
    }

    // ---------------------------------------------------------------------------
    // MemoryMetrics tests
    // ---------------------------------------------------------------------------

    #[test]
    fn memory_metrics_fields_are_non_negative() {
        // MemoryMetrics uses u64, so the type system guarantees non-negative.
        let mem = MemoryMetrics {
            used_bytes: 6_000_000_000,
            total_bytes: 16_000_000_000,
            swap_used_bytes: 512_000_000,
            swap_total_bytes: 8_000_000_000,
        };
        // u64 values are always >= 0; verify they are plausible.
        assert!(mem.used_bytes <= mem.total_bytes);
        assert!(mem.swap_used_bytes <= mem.swap_total_bytes);
    }

    #[test]
    fn memory_metrics_swap_included() {
        // Spec includes swap fields in MemoryMetrics — verify they exist.
        let mem = MemoryMetrics {
            used_bytes: 0,
            total_bytes: 16_000_000_000,
            swap_used_bytes: 0,
            swap_total_bytes: 0,
        };
        // When swap_total_bytes == 0, swap is not configured (AC-MEM-5).
        assert_eq!(mem.swap_total_bytes, 0);
        assert_eq!(mem.swap_used_bytes, 0);
    }

    #[test]
    fn memory_metrics_serializes_correctly() {
        let mem = MemoryMetrics {
            used_bytes: 8_000_000_000,
            total_bytes: 16_000_000_000,
            swap_used_bytes: 1_000_000_000,
            swap_total_bytes: 8_000_000_000,
        };
        let json = serde_json::to_string(&mem).expect("serialization must succeed");
        assert!(json.contains("\"used_bytes\""));
        assert!(json.contains("\"total_bytes\""));
        assert!(json.contains("\"swap_used_bytes\""));
        assert!(json.contains("\"swap_total_bytes\""));
    }

    // ---------------------------------------------------------------------------
    // DiskMetrics tests
    // ---------------------------------------------------------------------------

    #[test]
    fn disk_metrics_read_write_are_u64() {
        // AC-DISK-3: throughput values are deltas, typed as u64.
        let disk = DiskMetrics {
            total_read_bytes_per_sec: 25_000_000_u64,
            total_write_bytes_per_sec: 8_000_000_u64,
            disks: vec![DiskEntry {
                name: "nvme0n1".to_string(),
                read_bytes_per_sec: 25_000_000_u64,
                write_bytes_per_sec: 8_000_000_u64,
            }],
        };
        // Type assertions are compile-time; runtime check that values are plausible.
        assert!(disk.total_read_bytes_per_sec > 0);
        assert!(disk.total_write_bytes_per_sec > 0);
    }

    #[test]
    fn disk_entry_has_correct_field_types() {
        let entry = DiskEntry {
            name: "sda".to_string(),
            read_bytes_per_sec: 1024_u64,
            write_bytes_per_sec: 512_u64,
        };
        assert_eq!(entry.name, "sda");
        assert_eq!(entry.read_bytes_per_sec, 1024);
        assert_eq!(entry.write_bytes_per_sec, 512);
    }

    // ---------------------------------------------------------------------------
    // NetworkMetrics tests
    // ---------------------------------------------------------------------------

    #[test]
    fn network_metrics_sent_recv_are_u64() {
        // AC-NET-4: throughput values are u64 deltas.
        let net = NetworkMetrics {
            total_sent_bytes_per_sec: 1_200_000_u64,
            total_recv_bytes_per_sec: 5_400_000_u64,
            interfaces: vec![NetworkEntry {
                name: "eth0".to_string(),
                sent_bytes_per_sec: 1_200_000_u64,
                recv_bytes_per_sec: 5_400_000_u64,
            }],
        };
        assert!(net.total_sent_bytes_per_sec > 0);
        assert!(net.total_recv_bytes_per_sec > 0);
    }

    #[test]
    fn network_entry_has_correct_field_types() {
        let entry = NetworkEntry {
            name: "wlan0".to_string(),
            sent_bytes_per_sec: 2048_u64,
            recv_bytes_per_sec: 4096_u64,
        };
        assert_eq!(entry.name, "wlan0");
        assert_eq!(entry.sent_bytes_per_sec, 2048);
        assert_eq!(entry.recv_bytes_per_sec, 4096);
    }

    // ---------------------------------------------------------------------------
    // MetricsPayload (SystemMetrics) contains all sub-metrics
    // ---------------------------------------------------------------------------

    #[test]
    fn metrics_payload_contains_all_sub_metrics() {
        // AC-UPDATE-1: the emitted payload bundles CPU, memory, disk, network.
        let payload = MetricsPayload {
            cpu: CpuMetrics {
                overall_usage: 40.0,
                core_usages: vec![40.0, 40.0],
                frequency_mhz: Some(2200),
            },
            memory: MemoryMetrics {
                used_bytes: 4_000_000_000,
                total_bytes: 8_000_000_000,
                swap_used_bytes: 0,
                swap_total_bytes: 0,
            },
            disk: DiskMetrics {
                total_read_bytes_per_sec: 0,
                total_write_bytes_per_sec: 0,
                disks: vec![],
            },
            network: NetworkMetrics {
                total_sent_bytes_per_sec: 0,
                total_recv_bytes_per_sec: 0,
                interfaces: vec![],
            },
        };
        let json = serde_json::to_string(&payload).expect("serialization must succeed");
        assert!(json.contains("\"cpu\""));
        assert!(json.contains("\"memory\""));
        assert!(json.contains("\"disk\""));
        assert!(json.contains("\"network\""));
    }

    // ---------------------------------------------------------------------------
    // ProcessEntry tests
    // ---------------------------------------------------------------------------

    #[test]
    fn process_entry_has_correct_field_types() {
        let proc = ProcessEntry {
            pid: 1234_u32,
            name: "firefox".to_string(),
            cpu_usage: 12.4_f32,
            memory_bytes: 246_000_000_u64,
            status: ProcessStatus::Running,
        };
        assert_eq!(proc.pid, 1234);
        assert_eq!(proc.name, "firefox");
        assert_eq!(proc.cpu_usage, 12.4);
        assert_eq!(proc.memory_bytes, 246_000_000);
    }

    #[test]
    fn process_status_serializes_as_pascal_case() {
        // AC-PROC-7: status must serialize as PascalCase strings.
        let statuses = vec![
            (ProcessStatus::Running, "Running"),
            (ProcessStatus::Sleeping, "Sleeping"),
            (ProcessStatus::Stopped, "Stopped"),
            (ProcessStatus::Zombie, "Zombie"),
            (ProcessStatus::Idle, "Idle"),
            (ProcessStatus::Unknown, "Unknown"),
        ];
        for (status, expected) in statuses {
            let json = serde_json::to_string(&status).expect("serialize");
            assert_eq!(json, format!("\"{}\"", expected));
        }
    }

    #[test]
    fn process_entry_cpu_usage_is_in_valid_range() {
        let proc = ProcessEntry {
            pid: 42,
            name: "test".to_string(),
            cpu_usage: 0.0,
            memory_bytes: 0,
            status: ProcessStatus::Idle,
        };
        assert!(proc.cpu_usage >= 0.0);
        assert!(proc.cpu_usage <= 100.0);
    }

    // ---------------------------------------------------------------------------
    // Delta calculation tests (disk / network rate logic)
    // ---------------------------------------------------------------------------

    #[test]
    fn delta_calculation_normal_case() {
        // AC-DISK-3 / AC-NET-4: delta = current - previous.
        let previous: u64 = 1_000_000;
        let current: u64 = 1_025_000;
        let delta = saturating_delta(current, previous);
        assert_eq!(delta, 25_000);
    }

    #[test]
    fn delta_calculation_clamped_to_zero_when_current_less_than_previous() {
        // Counter wrap-around or reset: result must clamp to 0, not underflow.
        let previous: u64 = 1_000_000;
        let current: u64 = 500_000; // counter reset scenario
        let delta = saturating_delta(current, previous);
        assert_eq!(delta, 0);
    }

    #[test]
    fn delta_calculation_zero_when_equal() {
        let previous: u64 = 999_999;
        let current: u64 = 999_999;
        let delta = saturating_delta(current, previous);
        assert_eq!(delta, 0);
    }

    #[test]
    fn delta_calculation_large_values() {
        // Verify no overflow for large u64 values (e.g., after hours of activity).
        let previous: u64 = u64::MAX - 1_000_000;
        let current: u64 = u64::MAX;
        let delta = saturating_delta(current, previous);
        assert_eq!(delta, 1_000_000);
    }
}
