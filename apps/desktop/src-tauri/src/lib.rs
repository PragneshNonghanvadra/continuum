mod native_capture;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(native_capture::NativeCaptureState::default())
        .invoke_handler(tauri::generate_handler![
            native_capture::native_capture_status,
            native_capture::native_capture_start,
            native_capture::native_capture_stop
        ])
        .run(tauri::generate_context!())
        .expect("error while running Continuum");
}
