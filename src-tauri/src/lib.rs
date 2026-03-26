mod metrics;

use metrics::MetricsCollector;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::time::{interval, Duration};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub cpu_brand: String,
    pub cpu_count: usize,
}

pub struct AppState {
    pub collector: Mutex<MetricsCollector>,
}

#[tauri::command]
fn get_system_info(state: State<AppState>) -> SystemInfo {
    let collector = state.collector.lock().unwrap();
    collector.get_system_info()
}

#[tauri::command]
fn get_uptime(state: State<AppState>) -> u64 {
    let collector = state.collector.lock().unwrap();
    collector.get_uptime()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            collector: Mutex::new(MetricsCollector::new()),
        })
        .invoke_handler(tauri::generate_handler![get_system_info, get_uptime])
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                metrics_loop(app_handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn metrics_loop(app: AppHandle) {
    let mut ticker = interval(Duration::from_secs(1));
    loop {
        ticker.tick().await;
        let state = app.state::<AppState>();
        let (metrics, processes) = {
            let mut collector = state.collector.lock().unwrap();
            collector.refresh();
            (collector.get_metrics(), collector.get_processes())
        };
        let _ = app.emit("metrics-update", &metrics);
        let _ = app.emit("processes-update", &processes);
    }
}
