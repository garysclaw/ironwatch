# Ironwatch — Required Tools

This file is automatically updated as new tools are discovered during development.

## To Build and Run Ironwatch

### 1. Rust Toolchain
```bash
curl --proto='=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustc --version  # should be 1.70+
```

### 2. Node.js
```bash
# v18+ required, v22 recommended
node --version
```

### 3. Linux System Dependencies (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  pkg-config \
  libwebkit2gtk-4.1-dev \
  libssl-dev \
  libgtk-3-dev \
  librsvg2-dev \
  libxdo-dev \
  libayatana-appindicator3-dev \
  file
```

### 4. Tauri CLI
```bash
cargo install tauri-cli --version "^2"
cargo tauri --version
```

### 5. Install JS dependencies and run
```bash
npm install
npm run tauri dev
```

### 6. Build for production
```bash
npm run tauri build
```

## Tool Status

| Tool | Required For | Status |
|------|-------------|--------|
| Rust 1.70+ | Backend compilation | Install via rustup |
| Node.js 18+ | Frontend build | Available (v22) |
| build-essential | Rust compilation | Needs system install |
| libwebkit2gtk-4.1-dev | Tauri webview | Needs system install |
| libssl-dev | TLS in Rust | Needs system install |
| libgtk-3-dev | Tauri GTK | Needs system install |
| librsvg2-dev | Tauri icons | Needs system install |
| libayatana-appindicator3-dev | System tray (Phase 3) | Needs system install |

## Quick Setup Script
Save as `setup.sh` and run on your Linux machine:

```bash
#!/bin/bash
set -e
echo "Setting up Ironwatch development environment..."

# Rust
if ! command -v rustc &> /dev/null; then
  curl --proto='=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

# System deps
sudo apt-get update
sudo apt-get install -y \
  build-essential pkg-config \
  libwebkit2gtk-4.1-dev libssl-dev \
  libgtk-3-dev librsvg2-dev \
  libxdo-dev libayatana-appindicator3-dev file

# Tauri CLI
cargo install tauri-cli --version "^2"

# JS deps
npm install

echo "Done! Run: npm run tauri dev"
```
