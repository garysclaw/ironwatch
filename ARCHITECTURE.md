# Ironwatch — Technical Architecture

**Version:** 1.0
**Date:** 2026-03-26
**Status:** Draft

---

## 1. Tech Stack

| Layer             | Technology          | Version    | Notes                                      |
|-------------------|---------------------|------------|--------------------------------------------|
| Desktop shell     | Tauri               | 2.x        | Rust backend + WebView2/WebKitGTK frontend |
| Backend language  | Rust                | 1.77+      | Stable channel                             |
| Frontend framework| React               | 18.x       | Function components, hooks only            |
| Frontend language | TypeScript          | 5.x        | Strict mode enabled                        |
| Frontend build    | Vite                | 5.x        | Dev server + production bundler            |
| Metrics crate     | sysinfo             | 0.30.x     | Cross-platform system metrics              |
| Tauri API (JS)    | @tauri-apps/api     | 2.x        | event, core modules used                   |
| Styling           | CSS Modules         | —          | Scoped styles per component, no CSS-in-JS  |
| State management  | React built-ins     | —          | useState + useReducer + Context            |

No additional UI component library. No Redux, Zustand, or other external state library.

---

## 2. Folder Structure

```
ironwatch/
├── src-tauri/                    # Rust backend (Tauri)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── src/
│       ├── main.rs               # Tauri app entry point, setup, plugin registration
│       ├── lib.rs                # Library root (re-exports commands)
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── system_info.rs    # get_system_info, get_uptime commands
│       │   └── metrics.rs        # (reserved for any invoke-based commands)
│       ├── metrics/
│       │   ├── mod.rs
│       │   ├── collector.rs      # MetricsCollector struct, sysinfo refresh logic
│       │   ├── cpu.rs            # CpuMetrics collection
│       │   ├── memory.rs         # MemoryMetrics collection
│       │   ├── disk.rs           # DiskMetrics collection
│       │   ├── network.rs        # NetworkMetrics collection
│       │   └── process.rs        # ProcessList collection
│       ├── events/
│       │   ├── mod.rs
│       │   └── emitter.rs        # Background thread: emit metrics-update & processes-update
│       └── tray/
│           ├── mod.rs
│           └── tray.rs           # System tray setup and menu handlers
├── src/                          # React/TypeScript frontend
│   ├── main.tsx                  # React root mount
│   ├── App.tsx                   # App root component
│   ├── types/
│   │   └── metrics.ts            # All shared TypeScript types (canonical location)
│   ├── hooks/
│   │   ├── useMetrics.ts         # Subscribes to metrics-update event
│   │   ├── useProcesses.ts       # Subscribes to processes-update event
│   │   ├── useSystemInfo.ts      # Invokes get_system_info and get_uptime
│   │   └── useHistory.ts         # Manages 60-point rolling history buffers
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Dashboard.tsx     # Top-level grid layout
│   │   │   └── Dashboard.module.css
│   │   ├── cpu/
│   │   │   ├── CpuPanel.tsx      # CPU panel root
│   │   │   ├── CpuPanel.module.css
│   │   │   ├── CoreGrid.tsx      # Grid of per-core bars
│   │   │   └── CoreBar.tsx       # Single core bar + label
│   │   ├── memory/
│   │   │   ├── MemoryPanel.tsx   # Memory panel root
│   │   │   └── MemoryPanel.module.css
│   │   ├── disk/
│   │   │   ├── DiskPanel.tsx     # Disk panel root
│   │   │   └── DiskPanel.module.css
│   │   ├── network/
│   │   │   ├── NetworkPanel.tsx  # Network panel root
│   │   │   └── NetworkPanel.module.css
│   │   ├── processes/
│   │   │   ├── ProcessTable.tsx  # Process list table with sort
│   │   │   ├── ProcessRow.tsx    # Single process row
│   │   │   └── ProcessTable.module.css
│   │   ├── sysinfo/
│   │   │   ├── SystemInfoBar.tsx # System info bar (Phase 3)
│   │   │   └── SystemInfoBar.module.css
│   │   ├── sparkline/
│   │   │   ├── Sparkline.tsx     # SVG sparkline chart (Phase 3)
│   │   │   └── Sparkline.module.css
│   │   └── shared/
│   │       ├── MetricBar.tsx     # Reusable horizontal progress bar
│   │       └── MetricBar.module.css
│   └── utils/
│       └── format.ts             # formatBytes, formatBytesPerSec, formatUptime
├── public/
│   └── tray-icon.png             # 32x32 PNG system tray icon
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Rust Command Signatures

All commands are registered in `main.rs` via `.invoke_handler(tauri::generate_handler![...])`.

### 3.1 get_system_info

```rust
// File: src-tauri/src/commands/system_info.rs

#[derive(Debug, serde::Serialize)]
pub struct SystemInfo {
    pub os_name: Option<String>,
    pub kernel_version: Option<String>,
    pub hostname: Option<String>,
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo
```

Returns static system information. Called once at frontend startup.

### 3.2 get_uptime

```rust
// File: src-tauri/src/commands/system_info.rs

#[tauri::command]
pub fn get_uptime() -> u64
```

Returns system uptime in seconds as a `u64`. The frontend formats this value into `Xd Yh Zm`. Called once at startup and then every 60 seconds from the frontend.

---

## 4. Tauri Events

All events are emitted from the Rust backend to the frontend using `app_handle.emit(event_name, payload)`.

### 4.1 `metrics-update`

**Emitted:** Every 1 second from the background metrics thread.
**Direction:** Backend → Frontend

**Rust payload type:**

```rust
// File: src-tauri/src/metrics/mod.rs

#[derive(Debug, Clone, serde::Serialize)]
pub struct MetricsPayload {
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub disk: DiskMetrics,
    pub network: NetworkMetrics,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CpuMetrics {
    pub overall_usage: f32,           // 0.0 – 100.0
    pub core_usages: Vec<f32>,        // one entry per logical core, 0.0 – 100.0
    pub frequency_mhz: Option<u64>,   // None if unavailable
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryMetrics {
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub swap_used_bytes: u64,
    pub swap_total_bytes: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DiskMetrics {
    pub total_read_bytes_per_sec: u64,
    pub total_write_bytes_per_sec: u64,
    pub disks: Vec<DiskEntry>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DiskEntry {
    pub name: String,
    pub read_bytes_per_sec: u64,
    pub write_bytes_per_sec: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct NetworkMetrics {
    pub total_sent_bytes_per_sec: u64,   // excludes loopback
    pub total_recv_bytes_per_sec: u64,   // excludes loopback
    pub interfaces: Vec<NetworkEntry>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct NetworkEntry {
    pub name: String,
    pub sent_bytes_per_sec: u64,
    pub recv_bytes_per_sec: u64,
}
```

**Equivalent TypeScript payload type** (canonical location: `src/types/metrics.ts`):

```typescript
export interface MetricsPayload {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
}

export interface CpuMetrics {
  overall_usage: number;        // 0.0 – 100.0
  core_usages: number[];        // one per logical core
  frequency_mhz: number | null; // null if unavailable
}

export interface MemoryMetrics {
  used_bytes: number;
  total_bytes: number;
  swap_used_bytes: number;
  swap_total_bytes: number;
}

export interface DiskMetrics {
  total_read_bytes_per_sec: number;
  total_write_bytes_per_sec: number;
  disks: DiskEntry[];
}

export interface DiskEntry {
  name: string;
  read_bytes_per_sec: number;
  write_bytes_per_sec: number;
}

export interface NetworkMetrics {
  total_sent_bytes_per_sec: number;
  total_recv_bytes_per_sec: number;
  interfaces: NetworkEntry[];
}

export interface NetworkEntry {
  name: string;
  sent_bytes_per_sec: number;
  recv_bytes_per_sec: number;
}
```

---

### 4.2 `processes-update`

**Emitted:** Every 2 seconds from the background metrics thread.
**Direction:** Backend → Frontend

**Rust payload type:**

```rust
// File: src-tauri/src/metrics/process.rs

#[derive(Debug, Clone, serde::Serialize)]
pub struct ProcessesPayload {
    pub processes: Vec<ProcessEntry>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ProcessEntry {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,      // 0.0 – 100.0 (percentage of one core)
    pub memory_bytes: u64,   // resident set size in bytes
    pub status: ProcessStatus,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "PascalCase")]
pub enum ProcessStatus {
    Running,
    Sleeping,
    Stopped,
    Zombie,
    Idle,
    Unknown,
}
```

**Equivalent TypeScript types** (in `src/types/metrics.ts`):

```typescript
export interface ProcessesPayload {
  processes: ProcessEntry[];
}

export interface ProcessEntry {
  pid: number;
  name: string;
  cpu_usage: number;     // 0.0 – 100.0
  memory_bytes: number;  // bytes (RSS)
  status: ProcessStatus;
}

export type ProcessStatus =
  | "Running"
  | "Sleeping"
  | "Stopped"
  | "Zombie"
  | "Idle"
  | "Unknown";
```

---

## 5. React Component Tree

```
App
└── Dashboard
    ├── SystemInfoBar          (Phase 3) — displays OS, kernel, hostname, uptime
    ├── CpuPanel               — overall %, freq, core grid, sparkline (Phase 3)
    │   ├── MetricBar          — overall usage bar
    │   ├── CoreGrid           — wrapping grid of per-core bars
    │   │   └── CoreBar[]      — individual core label + bar
    │   └── Sparkline          (Phase 3) — SVG polyline history chart
    ├── MemoryPanel            — RAM %, swap, sparkline (Phase 3)
    │   ├── MetricBar          — RAM usage bar
    │   ├── MetricBar          — swap usage bar
    │   └── Sparkline          (Phase 3) — SVG polyline history chart
    ├── DiskPanel              — aggregate read/write, per-disk table
    │   └── [table rows]       — one row per DiskEntry
    ├── NetworkPanel           — aggregate up/down, per-interface table
    │   └── [table rows]       — one row per NetworkEntry
    └── ProcessTable           (Phase 2) — top 20 processes, sortable
        └── ProcessRow[]       — one row per ProcessEntry
```

### Component Responsibilities

| Component        | Props                                      | Responsibility                                                        |
|------------------|--------------------------------------------|-----------------------------------------------------------------------|
| `App`            | none                                       | Mounts hooks, provides MetricsContext, renders Dashboard              |
| `Dashboard`      | none                                       | CSS grid layout for all panels                                        |
| `SystemInfoBar`  | `info: SystemInfo`, `uptime: number`       | Renders static system info row                                        |
| `CpuPanel`       | `cpu: CpuMetrics`, `history: number[]`     | CPU overall, freq, core grid, sparkline                               |
| `CoreGrid`       | `coreUsages: number[]`                     | Renders a grid of CoreBar components                                  |
| `CoreBar`        | `index: number`, `usage: number`           | Single labeled bar for one CPU core                                   |
| `MemoryPanel`    | `memory: MemoryMetrics`, `history: number[]` | RAM and swap display, sparkline                                     |
| `DiskPanel`      | `disk: DiskMetrics`                        | Aggregate disk I/O and per-disk table                                 |
| `NetworkPanel`   | `network: NetworkMetrics`                  | Aggregate network I/O and per-interface table                         |
| `ProcessTable`   | `processes: ProcessEntry[]`                | Sortable process table; manages local sort state                      |
| `ProcessRow`     | `process: ProcessEntry`                    | One row of the process table                                          |
| `Sparkline`      | `data: number[]`, `color: string`          | SVG polyline chart, Y range 0–100                                     |
| `MetricBar`      | `value: number`, `max: number`             | Horizontal progress bar; value/max determines fill width              |

---

## 6. State Management

State is managed using React's built-in hooks. No external state library is used.

### 6.1 MetricsContext

A React context (`MetricsContext`) at the `App` level holds the latest received payload from the `metrics-update` event. All panels consume this context.

```typescript
// src/types/metrics.ts (context type)
export interface MetricsContextValue {
  metrics: MetricsPayload | null;
}
```

`App.tsx` initializes `MetricsContext` and uses the `useMetrics` hook to populate it.

### 6.2 ProcessesContext

A React context (`ProcessesContext`) holds the latest process list from `processes-update`.

```typescript
export interface ProcessesContextValue {
  processes: ProcessEntry[];
}
```

### 6.3 Local Component State

- `ProcessTable` maintains local sort state: `{ column: SortColumn; direction: 'asc' | 'desc' }` using `useState`.
- `SystemInfoBar` maintains uptime via `useState`, refreshed by a `setInterval` every 60 seconds that calls `get_uptime` via Tauri `invoke`.

```typescript
// Sort state in ProcessTable
type SortColumn = 'pid' | 'name' | 'cpu_usage' | 'memory_bytes' | 'status';
interface SortState {
  column: SortColumn;
  direction: 'asc' | 'desc';
}
```

### 6.4 History Buffers

The `useHistory` hook maintains two arrays in a `useRef` (not `useState`, to avoid re-renders from the ref itself) and exposes snapshot arrays via `useState` that are updated on each `metrics-update` event.

```typescript
// src/hooks/useHistory.ts
interface HistoryState {
  cpuHistory: number[];    // max 60 entries
  memHistory: number[];    // max 60 entries
}
```

---

## 7. Data Flow Diagram

```
Linux Kernel / /proc / /sys
         |
         v
  [sysinfo crate]
         |
         v
  MetricsCollector (Rust)
  - refresh() called every 1s
  - process refresh() every 2s
         |
         |--- every 1s ---> emit("metrics-update", MetricsPayload)
         |                         |
         |--- every 2s ---> emit("processes-update", ProcessesPayload)
                                   |
                     [Tauri WebView IPC bridge]
                                   |
                     [Frontend event listener]
                          /               \
               useMetrics hook       useProcesses hook
                    |                       |
             MetricsContext          ProcessesContext
              /    |    \                   |
        CpuPanel  Mem  Disk/Net       ProcessTable
          |        |
      useHistory hook
          |
      Sparkline components
```

---

## 8. IPC Protocol Details

### 8.1 Event subscription (frontend)

```typescript
import { listen } from '@tauri-apps/api/event';

// Subscribe
const unlisten = await listen<MetricsPayload>('metrics-update', (event) => {
  // event.payload is MetricsPayload
});

// Cleanup on unmount
return () => { unlisten(); };
```

### 8.2 Command invocation (frontend)

```typescript
import { invoke } from '@tauri-apps/api/core';

const info = await invoke<SystemInfo>('get_system_info');
const uptimeSecs = await invoke<number>('get_uptime');
```

### 8.3 Backend event emission

```rust
// emitter.rs
use std::thread;
use std::time::Duration;
use tauri::Manager;

pub fn start_metrics_loop(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let mut collector = MetricsCollector::new();
        let mut tick: u64 = 0;
        loop {
            collector.refresh();
            let payload = collector.get_metrics_payload();
            app_handle.emit("metrics-update", payload).ok();

            if tick % 2 == 0 {
                let processes = collector.get_processes_payload();
                app_handle.emit("processes-update", processes).ok();
            }

            tick += 1;
            thread::sleep(Duration::from_secs(1));
        }
    });
}
```

---

## 9. Key Rust Crates

| Crate                    | Version  | Purpose                                                              |
|--------------------------|----------|----------------------------------------------------------------------|
| `tauri`                  | 2.x      | Desktop app shell, IPC, window management, system tray               |
| `sysinfo`                | 0.30.x   | CPU, memory, disk, network, process metrics on Linux                 |
| `serde`                  | 1.x      | Serialization of Rust structs to JSON for IPC payloads               |
| `serde_json`             | 1.x      | JSON encoding (used internally by Tauri's IPC layer)                 |

No additional async runtime (Tokio) is needed — the metrics loop uses `std::thread`. If async Tauri commands are added later, `tokio` is provided transitively by Tauri 2.

---

## 10. Error Handling Strategy

### 10.1 Rust backend

- **Metric collection errors**: If `sysinfo` returns 0 or an empty value for a metric that should not be 0 (e.g., frequency), the field is wrapped in `Option<T>` and set to `None`. Serialized to JSON as `null`.
- **sysinfo refresh panics**: `sysinfo` calls are not expected to panic on Linux; no special panic handling is added.
- **Event emission errors**: `.ok()` is called on `app_handle.emit(...)` results; errors are silently dropped. This is acceptable because the frontend will simply display stale data until the next successful emission.
- **Command errors**: `get_system_info` and `get_uptime` return data directly (not `Result`). If sysinfo returns empty strings, `Option::None` is used and serialized as `null`.

### 10.2 Frontend

- **Null checks**: All optional fields in `MetricsPayload` (e.g., `frequency_mhz`) are checked before rendering. If `null`, the UI renders "N/A".
- **Initial state**: `MetricsContext` starts with `metrics: null`. All panels check for null and render a loading skeleton or blank state until the first event arrives.
- **Tauri invoke errors**: Calls to `invoke` in `useSystemInfo` are wrapped in `try/catch`. On error, fields default to `"Unknown"`.
- **Type safety**: TypeScript strict mode is enabled. All event payloads are typed against the interfaces in `src/types/metrics.ts`. No `any` types.

### 10.3 Process Status Mapping

The sysinfo `ProcessStatus` enum is mapped to the spec's six string values in Rust before serialization:

```rust
fn map_process_status(status: &sysinfo::ProcessStatus) -> ProcessStatus {
    match status {
        sysinfo::ProcessStatus::Run => ProcessStatus::Running,
        sysinfo::ProcessStatus::Sleep => ProcessStatus::Sleeping,
        sysinfo::ProcessStatus::Stop => ProcessStatus::Stopped,
        sysinfo::ProcessStatus::Zombie => ProcessStatus::Zombie,
        sysinfo::ProcessStatus::Idle => ProcessStatus::Idle,
        _ => ProcessStatus::Unknown,
    }
}
```

---

## 11. Tauri Configuration Notes

Relevant `tauri.conf.json` settings:

- `app.windows[0].title`: `"Ironwatch"`
- `app.windows[0].width`: `1200`
- `app.windows[0].height`: `800`
- `app.windows[0].minWidth`: `900`
- `app.windows[0].minHeight`: `600`
- `app.windows[0].closeRequestedBehavior`: Window close button hides the window (handled via Tauri's `CloseRequested` event listener in Rust) rather than quitting — requires listening to `tauri::WindowEvent::CloseRequested` and calling `event.prevent_close()` followed by `window.hide()`.
- System tray is configured via Tauri 2's `tray` plugin (`tauri-plugin-tray` is part of Tauri 2 core).

---

## 12. Build and Development

```bash
# Install frontend dependencies
npm install

# Run in dev mode (hot reload)
cargo tauri dev

# Build production binary
cargo tauri build
```

The production build produces a self-contained binary (AppImage or .deb depending on build flags). All frontend assets are bundled into the binary.
