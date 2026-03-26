# Ironwatch — Feature Specification

**Version:** 1.0
**Date:** 2026-03-26
**Status:** Draft

---

## 1. Overview and Goals

Ironwatch is a Linux desktop application that provides a real-time view of system performance metrics. It is built with Tauri 2 (Rust backend + React/TypeScript frontend) and targets modern Linux distributions (Ubuntu 22.04+, Fedora 38+, Arch Linux).

### Goals

- Provide an accurate, low-latency display of CPU, memory, disk, and network metrics updated every second.
- Give users a sortable process list showing the top resource consumers.
- Display rolling 60-second historical charts for key metrics.
- Run efficiently with minimal CPU and memory overhead from the monitor itself.
- Present all data in a clean, readable desktop UI without requiring a browser or external server.

### Non-Goals

The following are explicitly out of scope for all three phases:

- **Remote monitoring**: Ironwatch only monitors the local machine. No SSH, agent-based, or network-connected monitoring.
- **Alerting or notifications**: No threshold alerts, email/webhook notifications, or desktop alert popups.
- **Data persistence or logging**: No writing metrics to disk, databases, or log files. History is in-memory only.
- **Cross-platform support**: Windows and macOS are not targeted. The app is Linux-only.
- **Process management**: Users cannot kill, pause, or change priority of processes from the UI.
- **GPU metrics**: GPU usage, VRAM, and temperature are not displayed.
- **Temperature/fan sensors**: Hardware sensor data (lm-sensors style) is not included.
- **Multiple windows or tabs**: The app is a single-window application.
- **Theming or customization**: No user-configurable themes, colors, or layouts beyond what ships by default.
- **Internationalization (i18n)**: The UI is English-only.
- **Auto-update**: The app does not self-update.

---

## 2. Phase 1 — Core Metrics (MVP)

### 2.1 CPU Metrics

#### Description

The CPU panel shows a live snapshot of processor utilization updated every second.

**Overall CPU usage**: A single percentage value (0–100%) representing aggregate usage across all logical cores, derived from the total user+system time divided by total CPU time.

**Per-core usage**: An individual percentage (0–100%) for each logical core (e.g., Core 0, Core 1, … Core N-1), where N is the number of logical CPUs reported by the OS.

**Current frequency**: The current operating frequency of CPU core 0 in MHz, as an integer. If per-core frequency is available, the value displayed is that of core 0.

#### UI Layout

The CPU panel occupies the top-left quadrant of the main dashboard. It contains:

- A large numeric display showing overall CPU percentage (e.g., "47%") with a label "CPU".
- A horizontal bar (progress bar style) spanning the full panel width, filled proportionally to the overall usage percentage.
- A sub-section labeled "Cores" showing a grid of small horizontal bars, one per logical core, each labeled "Core 0", "Core 1", etc. The grid wraps at 4 columns.
- A small text label below the bars showing "Freq: 2400 MHz" (core 0 frequency).

#### Acceptance Criteria

- AC-CPU-1: The overall CPU percentage updates every 1 second (±100 ms).
- AC-CPU-2: The overall percentage is a floating-point number rounded to one decimal place (e.g., 47.3%).
- AC-CPU-3: Per-core percentages are displayed for every logical core reported by the OS.
- AC-CPU-4: Each per-core percentage is rounded to one decimal place.
- AC-CPU-5: CPU frequency is displayed in MHz as an integer.
- AC-CPU-6: If the sysinfo crate returns 0 for frequency, the frequency display shows "N/A" instead of "0 MHz".
- AC-CPU-7: All CPU values are sourced from a Tauri event payload — no frontend polling via `invoke`.

---

### 2.2 Memory Metrics

#### Description

The memory panel shows RAM and swap usage updated every second.

**RAM used**: Bytes of physical RAM currently in use (as reported by sysinfo `used_memory()`).
**RAM total**: Total physical RAM in bytes.
**RAM used %**: `(used / total) * 100`, rounded to one decimal place.
**Swap used**: Bytes of swap currently in use.
**Swap total**: Total swap space in bytes.

All byte values are displayed to the user in human-readable form: values >= 1 GiB are shown as GiB (e.g., "7.4 GiB"), values >= 1 MiB as MiB, values >= 1 KiB as KiB, otherwise bytes. Use binary units (1 GiB = 1,073,741,824 bytes).

#### UI Layout

The memory panel occupies the top-right quadrant of the main dashboard. It contains:

- A label "Memory" at the top.
- A large numeric display showing RAM usage percentage (e.g., "62.1%").
- A horizontal bar filled proportionally to RAM usage percentage.
- A text line showing "Used: 9.8 GiB / 15.6 GiB".
- A section labeled "Swap" with a smaller horizontal bar filled proportionally to swap usage.
- A text line below swap bar showing "Swap: 1.2 GiB / 8.0 GiB".
- If swap total is 0, the swap section shows "Swap: not configured".

#### Acceptance Criteria

- AC-MEM-1: RAM used, total, and percentage update every 1 second (±100 ms).
- AC-MEM-2: Swap used and total update every 1 second (±100 ms).
- AC-MEM-3: All byte values are displayed using binary units (KiB, MiB, GiB) with one decimal place.
- AC-MEM-4: RAM percentage is rounded to one decimal place.
- AC-MEM-5: When swap total is 0 bytes, the swap bar is hidden and the text "Swap: not configured" is shown.
- AC-MEM-6: All memory values come from a Tauri event payload.

---

### 2.3 Disk Metrics

#### Description

The disk panel shows aggregate and per-disk I/O throughput updated every second.

**Read bytes/sec**: Total bytes read per second across all disks, calculated as the delta of cumulative read bytes between consecutive samples divided by the elapsed interval.
**Write bytes/sec**: Total bytes written per second across all disks.
**Per-disk breakdown**: For each disk (block device), the name, read bytes/sec, and write bytes/sec.

Throughput values are displayed in human-readable form using the same binary unit formatting as memory (KiB/s, MiB/s, GiB/s).

#### UI Layout

The disk panel occupies the bottom-left quadrant of the main dashboard. It contains:

- A label "Disk I/O" at the top.
- Two summary lines: "Read: 24.3 MiB/s" and "Write: 8.1 MiB/s".
- A table with columns: Disk, Read/s, Write/s. Each row represents one disk device.
- Disk names are shown as their device name (e.g., "sda", "nvme0n1").
- If no disk activity is detected (all zeros), the table is still shown with 0 values.

#### Acceptance Criteria

- AC-DISK-1: Aggregate read and write bytes/sec update every 1 second (±100 ms).
- AC-DISK-2: Per-disk rows are present for every disk reported by sysinfo.
- AC-DISK-3: Throughput values are calculated as deltas between consecutive 1-second samples, not cumulative totals.
- AC-DISK-4: Throughput values are displayed in human-readable binary units (KiB/s, MiB/s, GiB/s) with one decimal place.
- AC-DISK-5: If a disk disappears between samples, it is removed from the table on the next update.
- AC-DISK-6: All disk values come from a Tauri event payload.

---

### 2.4 Network Metrics

#### Description

The network panel shows aggregate and per-interface network throughput updated every second.

**Bytes sent/sec**: Total bytes transmitted per second across all active network interfaces.
**Bytes received/sec**: Total bytes received per second across all active network interfaces.
**Per-interface breakdown**: For each interface, the name, bytes sent/sec, and bytes received/sec.

The loopback interface (`lo`) is included in the per-interface table but excluded from the aggregate totals.

Throughput values are displayed in human-readable binary units (KiB/s, MiB/s, GiB/s).

#### UI Layout

The network panel occupies the bottom-right quadrant of the main dashboard. It contains:

- A label "Network" at the top.
- Two summary lines: "Up: 1.2 MiB/s" and "Down: 5.4 MiB/s".
- A table with columns: Interface, Up/s, Down/s. Each row is one network interface.
- Interface names are shown as-is from the OS (e.g., "eth0", "wlan0", "enp3s0").

#### Acceptance Criteria

- AC-NET-1: Aggregate sent and received bytes/sec update every 1 second (±100 ms).
- AC-NET-2: Per-interface rows are present for every interface reported by sysinfo.
- AC-NET-3: The loopback interface (`lo`) is shown in the per-interface table but is excluded from aggregate totals.
- AC-NET-4: Throughput values are calculated as deltas between consecutive 1-second samples.
- AC-NET-5: Throughput values are displayed in human-readable binary units with one decimal place.
- AC-NET-6: Interfaces that disappear between samples are removed from the table on the next update.
- AC-NET-7: All network values come from a Tauri event payload.

---

### 2.5 Update Mechanism

All Phase 1 metrics are delivered to the frontend via a single Tauri event named `metrics-update`, emitted once per second from a background Rust thread. The frontend subscribes to this event on mount and unsubscribes on unmount.

#### Acceptance Criteria

- AC-UPDATE-1: The `metrics-update` event is emitted exactly once per second from the Rust backend.
- AC-UPDATE-2: The frontend renders updated values within 200 ms of receiving the event.
- AC-UPDATE-3: If the backend fails to collect a metric (e.g., permission error), the affected field is set to `null` in the event payload and the UI shows "N/A" for that value.
- AC-UPDATE-4: No metrics are fetched via `tauri::command` invoke on a polling timer from the frontend — all updates are push-based via events.

---

## 3. Phase 2 — Process List

### 3.1 Process Table

#### Description

A dedicated "Processes" section (below the four metric panels or accessible via a tab) displays the top 20 processes sorted by CPU usage descending by default.

**Columns:**

| Column     | Type    | Description                                                      |
|------------|---------|------------------------------------------------------------------|
| PID        | integer | Process ID                                                       |
| Name       | string  | Process name (not full path)                                     |
| CPU %      | float   | CPU usage percentage, one decimal place (e.g., 12.4%)           |
| Memory     | string  | Resident memory in MiB, one decimal place (e.g., "234.5 MiB")  |
| Status     | string  | One of: Running, Sleeping, Stopped, Zombie, Idle, Unknown        |

Only the top 20 processes by CPU usage are fetched and displayed. The list is pre-sorted server-side before emission.

#### Sorting

The user can click any column header to sort by that column. Clicking the same header again toggles between ascending and descending order. The active sort column header is visually marked with an arrow indicator (↑ for ascending, ↓ for descending).

Default sort: CPU % descending.

When the user has selected a sort column other than CPU %, the frontend re-sorts the received list client-side on each update without re-fetching.

#### Refresh Rate

The process list refreshes every 2 seconds via a separate Tauri event named `processes-update`.

#### UI Layout

The process section appears below the four metric panels and spans the full width of the window. It contains:

- A header row with clickable column labels: PID, Name, CPU %, Memory, Status.
- Up to 20 data rows, each representing one process.
- If fewer than 20 processes are running, all running processes are shown.
- Row hover state is highlighted with a subtle background color change.
- The section has a label "Processes (Top 20)" at the top.

#### Acceptance Criteria

- AC-PROC-1: The process list updates every 2 seconds (±200 ms).
- AC-PROC-2: Exactly the top 20 processes by CPU usage are included in the event payload. If fewer than 20 processes exist, all are included.
- AC-PROC-3: Clicking a column header sorts the displayed list by that column. Clicking again reverses the order.
- AC-PROC-4: The active sort column is visually indicated with a directional arrow.
- AC-PROC-5: Memory is displayed in MiB with one decimal place.
- AC-PROC-6: CPU % is displayed with one decimal place.
- AC-PROC-7: Process status is one of the six defined values: Running, Sleeping, Stopped, Zombie, Idle, Unknown. Any unmapped sysinfo status maps to "Unknown".
- AC-PROC-8: The process list is delivered via the `processes-update` Tauri event — no `invoke` polling.

---

## 4. Phase 3 — History and Polish

### 4.1 Rolling History Charts

#### Description

The CPU overall usage and RAM usage percentage are tracked with a 60-second rolling history buffer maintained in the frontend state. On each `metrics-update` event, the new value is appended to the buffer and the oldest value is dropped if the buffer exceeds 60 entries.

A sparkline chart (a minimal line chart without axes labels) is displayed inside the CPU panel and the Memory panel, showing the last 60 data points.

#### Chart Specifications

- Width: full width of the containing panel.
- Height: 40px.
- No X/Y axis labels or tick marks.
- A single line representing the metric over time, left = oldest, right = newest.
- Line color: distinct per metric (CPU = blue, Memory = green).
- The Y-axis range is fixed 0–100 (representing 0%–100%).
- No tooltips on hover (keeps the chart minimal).

#### Acceptance Criteria

- AC-HIST-1: The history buffer holds exactly 60 values for CPU and 60 values for memory.
- AC-HIST-2: On each `metrics-update` event, one value is appended and values older than 60 seconds are dropped (FIFO).
- AC-HIST-3: The sparkline chart renders within the CPU panel and Memory panel.
- AC-HIST-4: The sparkline Y-axis is fixed at 0–100 regardless of current values.
- AC-HIST-5: The sparkline correctly renders with fewer than 60 points when the app has been running for less than 60 seconds.
- AC-HIST-6: No external charting library is required — the sparkline is rendered using an SVG `<polyline>` element computed from the history array.

---

### 4.2 System Info Panel

#### Description

A compact panel above or below the four metric panels (but above the process list) shows static system information collected once at application startup.

**Fields displayed:**

| Label          | Value Example             | Source                              |
|----------------|---------------------------|-------------------------------------|
| OS             | Ubuntu 24.04              | sysinfo `os_version()`              |
| Kernel         | 6.8.0-45-generic          | sysinfo `kernel_version()`          |
| Hostname       | my-workstation            | sysinfo `host_name()`               |
| Uptime         | 3d 14h 22m                | sysinfo `uptime()`, formatted       |

Uptime is formatted as: `Xd Yh Zm` where X, Y, Z are days, hours (0–23), minutes (0–59). Uptime updates every 60 seconds (not every second).

#### UI Layout

The system info panel spans the full width of the window, appears as a single row or compact card, and contains the four labeled fields side-by-side. It is not collapsible.

#### Acceptance Criteria

- AC-SYSINFO-1: OS name, kernel version, and hostname are fetched once at startup via the `get_system_info` Tauri command.
- AC-SYSINFO-2: Uptime is fetched once at startup and then refreshed every 60 seconds via the `get_uptime` Tauri command.
- AC-SYSINFO-3: Uptime is formatted as `Xd Yh Zm` (e.g., "3d 14h 22m").
- AC-SYSINFO-4: If any system info field is unavailable, it displays "Unknown".

---

### 4.3 System Tray

#### Description

Ironwatch installs a system tray icon that persists when the main window is hidden (minimized to tray). The tray icon is a static PNG icon included with the app.

**Tray tooltip**: A string dynamically updated every 5 seconds showing current CPU and memory usage. Format: `"Ironwatch — CPU: 34.2% | Mem: 61.5%"`.

**Tray menu** (right-click):

| Item          | Action                                  |
|---------------|-----------------------------------------|
| Show Window   | Restores the main window if hidden      |
| Hide Window   | Hides the main window to tray           |
| Quit          | Exits the application completely        |

Clicking the tray icon (left-click) toggles window visibility: if the window is visible, it hides it; if hidden, it shows and focuses it.

#### Acceptance Criteria

- AC-TRAY-1: A system tray icon is visible in the system tray when the application is running.
- AC-TRAY-2: The tray tooltip shows the current CPU % and memory % in the format `"Ironwatch — CPU: X.X% | Mem: Y.Y%"`.
- AC-TRAY-3: The tooltip is updated every 5 seconds.
- AC-TRAY-4: Right-clicking the tray icon shows a context menu with "Show Window", "Hide Window", and "Quit".
- AC-TRAY-5: Clicking "Show Window" makes the main window visible and brings it to focus.
- AC-TRAY-6: Clicking "Hide Window" hides the main window without exiting the app.
- AC-TRAY-7: Clicking "Quit" exits the Tauri process completely.
- AC-TRAY-8: Left-clicking the tray icon toggles main window visibility.
- AC-TRAY-9: Closing the main window via the OS close button hides the window to tray rather than quitting the app.

---

## 5. UI Layout Summary

The application window is a single-page layout with no navigation tabs in Phase 1 or 2. Phase 3 retains the same single-page layout.

```
+----------------------------------------------------------+
|  [Tray icon in system tray — not part of window]         |
+----------------------------------------------------------+
|  SYSTEM INFO BAR  (Phase 3)                              |
|  OS: Ubuntu 24.04 | Kernel: 6.8.0 | Host: x | Up: 3d 2h |
+----------------------------------------------------------+
|  CPU PANEL (top-left)  |  MEMORY PANEL (top-right)       |
|  Overall: 47.3%        |  RAM: 62.1%                     |
|  [bar]                 |  [bar]                          |
|  Cores: [grid of bars] |  Used: 9.8 GiB / 15.6 GiB      |
|  Freq: 2400 MHz        |  Swap: [bar]                    |
|  [sparkline] (Ph3)     |  Swap: 1.2 GiB / 8.0 GiB       |
|                        |  [sparkline] (Ph3)              |
+----------------------------------------------------------+
|  DISK PANEL (bottom-left) | NETWORK PANEL (bottom-right) |
|  Read: 24.3 MiB/s         | Up: 1.2 MiB/s               |
|  Write: 8.1 MiB/s         | Down: 5.4 MiB/s             |
|  [table: Disk/R/W]        | [table: Iface/Up/Down]      |
+----------------------------------------------------------+
|  PROCESSES (Top 20) — full width  (Phase 2)              |
|  PID | Name      | CPU % | Memory   | Status            |
|  ...                                                     |
+----------------------------------------------------------+
```

Window minimum size: 900px wide × 600px tall.
Window default size: 1200px wide × 800px tall.

---

## 6. General Acceptance Criteria

- AC-GENERAL-1: The application launches without errors on Ubuntu 22.04+ with a Wayland or X11 session.
- AC-GENERAL-2: Memory usage of the Ironwatch process itself does not exceed 150 MB RSS during normal operation.
- AC-GENERAL-3: CPU usage of the Ironwatch process does not exceed 2% on a modern multi-core processor during idle metric polling.
- AC-GENERAL-4: The application window title is "Ironwatch".
- AC-GENERAL-5: All metric values display "N/A" instead of crashing when the backend returns `null` for a field.
- AC-GENERAL-6: The application compiles and runs with `cargo tauri dev` and produces a distributable with `cargo tauri build`.
