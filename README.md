# ⚡ Ironwatch

A real-time Linux system performance dashboard. Built with [Tauri 2](https://tauri.app/) (Rust backend + React frontend).

**Status: Active development — Phase 1 in progress**

---

## What it does

Ironwatch is a native desktop app that shows live system metrics — CPU, memory, disk, and network — updated every second. Think of it as `htop` but visual, with sparklines and a process table you can sort.

![Dashboard preview coming soon]()

### Phases

| Phase | Features | Status |
|-------|----------|--------|
| 1 | CPU (overall + per-core + frequency), Memory (RAM + swap), Disk usage + I/O, Network rx/tx | 🔨 Building |
| 2 | Process list — top 20 by CPU, sortable columns | Planned |
| 3 | 60-second sparklines, system tray with CPU tooltip | Planned |

---

## Tech stack

| Layer | Tech |
|-------|------|
| Backend | Rust 1.70+, [sysinfo](https://crates.io/crates/sysinfo) crate |
| Bridge | Tauri 2 IPC (commands + events) |
| Frontend | React 18, TypeScript 5, Vite 5 |
| Styling | CSS Modules, dark theme |
| Testing | Vitest, @testing-library/react, Rust unit tests |

### Architecture

The Rust backend runs a 1-second loop using `tokio`, collects metrics via `sysinfo`, and pushes them to the frontend via Tauri events:

```
Rust (sysinfo) → MetricsCollector → tauri::emit("metrics-update") → React (MetricsContext)
                                  → tauri::emit("processes-update") → React (ProcessesContext)
```

Frontend state flows:
- `MetricsContext` holds the latest `SystemMetrics` and `SystemInfo`
- `ProcessesContext` holds the latest `Vec<ProcessInfo>`
- `useHistory` hook maintains a 60-point rolling buffer for sparklines

---

## Development setup

### Requirements

**Linux (Ubuntu/Debian):**
```bash
# Rust
curl --proto='=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# System dependencies
sudo apt-get install -y \
  build-essential pkg-config \
  libwebkit2gtk-4.1-dev libssl-dev \
  libgtk-3-dev librsvg2-dev \
  libxdo-dev libayatana-appindicator3-dev \
  file

# Tauri CLI
cargo install tauri-cli --version "^2"
```

**Node.js 18+ is also required** (v22 recommended).

See [`TOOLS.md`](./TOOLS.md) for the full setup script.

### Run in dev mode

```bash
npm install
npm run tauri dev
```

### Run tests

```bash
# Frontend tests
npm test

# Rust tests
cd src-tauri && cargo test
```

### Build for production

```bash
npm run tauri build
```

---

## Project structure

```
ironwatch/
├── src/                        # React frontend
│   ├── components/
│   │   ├── CpuPanel/           # CPU usage + per-core bars + sparkline
│   │   ├── MemoryPanel/        # RAM + swap bars + sparkline
│   │   ├── DiskPanel/          # Disk usage per mount point
│   │   ├── NetworkPanel/       # rx/tx per interface
│   │   ├── ProcessTable/       # Sortable process list
│   │   ├── SystemInfoBar/      # Hostname, OS, uptime
│   │   ├── MetricBar/          # Reusable progress bar
│   │   └── Sparkline/          # SVG sparkline component
│   ├── contexts/               # MetricsContext, ProcessesContext
│   ├── hooks/                  # useHistory (rolling buffer)
│   ├── types/                  # TypeScript interfaces
│   └── tests/                  # Component tests
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Tauri entry point
│   │   ├── lib.rs              # Commands, event loop, state
│   │   └── metrics.rs          # MetricsCollector (sysinfo)
│   └── Cargo.toml
├── SPEC.md                     # Feature spec with acceptance criteria
├── ARCHITECTURE.md             # Architecture decisions
└── TOOLS.md                    # Build requirements and setup
```

---

## Git workflow

- Every feature gets its own branch: `feature/<name>`
- PRs into `main` — squash merged
- Tests written before implementation (TDD)
- Spec and architecture docs merged via PR first

### Active branches

| Branch | Purpose |
|--------|---------|
| `feature/scaffold` | Full project scaffold + Phase 1 implementation |
| `feature/tests` | Test suite (Rust + React) |

---

## Docs

- [`SPEC.md`](./SPEC.md) — Full feature spec with acceptance criteria
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Architecture decisions and component design
- [`TOOLS.md`](./TOOLS.md) — Build requirements and setup guide

