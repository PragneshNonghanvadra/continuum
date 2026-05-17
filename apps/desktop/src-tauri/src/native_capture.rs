use serde::Serialize;
use std::process::{Child, Command as StdCommand, Stdio};
use std::sync::Mutex;
use tauri_plugin_shell::ShellExt;

#[derive(Default)]
pub struct NativeCaptureState {
    runtime: Mutex<NativeCaptureRuntime>,
}

#[derive(Default)]
struct NativeCaptureRuntime {
    status: NativeCaptureStatus,
    child: Option<Child>,
}

pub struct NativeCaptureLaunch {
    child: Option<Child>,
    helper_path: Option<String>,
    last_error: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeCaptureStatus {
    pub running: bool,
    pub session_id: Option<String>,
    pub api_base_url: Option<String>,
    pub helper_path: Option<String>,
    pub last_error: Option<String>,
}

impl NativeCaptureState {
    fn status(&self) -> Result<NativeCaptureStatus, String> {
        Ok(self
            .runtime
            .lock()
            .map_err(|_| "Native capture state is unavailable".to_string())?
            .status
            .clone())
    }

    fn start_with_launcher<F>(
        &self,
        session_id: String,
        api_base_url: String,
        launcher: F,
    ) -> Result<NativeCaptureStatus, String>
    where
        F: FnOnce(&str, &str) -> NativeCaptureLaunch,
    {
        if session_id.trim().is_empty() {
            return Err("Session id is required to start native capture".to_string());
        }
        if api_base_url.trim().is_empty() {
            return Err("API base URL is required to start native capture".to_string());
        }

        let launch = launcher(&session_id, &api_base_url);
        let status = NativeCaptureStatus {
            api_base_url: Some(api_base_url),
            helper_path: launch.helper_path,
            last_error: launch.last_error,
            running: true,
            session_id: Some(session_id),
        };
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| "Native capture state is unavailable".to_string())?;
        runtime.child = launch.child;
        runtime
            .status = status.clone();
        Ok(status)
    }

    fn stop(&self) -> Result<NativeCaptureStatus, String> {
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| "Native capture state is unavailable".to_string())?;
        if let Some(mut child) = runtime.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        runtime.status.running = false;
        runtime.status.session_id = None;
        Ok(runtime.status.clone())
    }
}

fn launch_native_helper(
    app: &tauri::AppHandle,
    session_id: &str,
    api_base_url: &str,
) -> NativeCaptureLaunch {
    if let Ok(path) = std::env::var("CONTINUUM_NATIVE_HELPER_PATH") {
        return launch_command(
            path.clone(),
            StdCommand::new(&path),
            session_id,
            api_base_url,
        );
    }

    match app.shell().sidecar("continuum-native-capture") {
        Ok(command) => {
            let std_command: StdCommand = command.into();
            launch_command(
                "sidecar:continuum-native-capture".to_string(),
                std_command,
                session_id,
                api_base_url,
            )
        }
        Err(error) => NativeCaptureLaunch {
            child: None,
            helper_path: Some("sidecar:continuum-native-capture".to_string()),
            last_error: Some(format!("Unable to resolve native helper sidecar: {error}")),
        },
    }
}

fn launch_command(
    helper_path: String,
    mut command: StdCommand,
    session_id: &str,
    api_base_url: &str,
) -> NativeCaptureLaunch {
    match command
        .arg("run")
        .arg("--session-id")
        .arg(session_id)
        .arg("--api-base-url")
        .arg(api_base_url)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => NativeCaptureLaunch {
            child: Some(child),
            helper_path: Some(helper_path),
            last_error: None,
        },
        Err(error) => NativeCaptureLaunch {
            child: None,
            helper_path: Some(helper_path),
            last_error: Some(format!("Unable to start native helper: {error}")),
        },
    }
}

#[tauri::command]
pub fn native_capture_status(state: tauri::State<'_, NativeCaptureState>) -> Result<NativeCaptureStatus, String> {
    state.status()
}

#[tauri::command]
pub async fn native_capture_start(
    app: tauri::AppHandle,
    state: tauri::State<'_, NativeCaptureState>,
    session_id: String,
    api_base_url: String,
) -> Result<NativeCaptureStatus, String> {
    state.start_with_launcher(session_id, api_base_url, |session_id, api_base_url| {
        launch_native_helper(&app, session_id, api_base_url)
    })
}

#[tauri::command]
pub async fn native_capture_stop(state: tauri::State<'_, NativeCaptureState>) -> Result<NativeCaptureStatus, String> {
    state.stop()
}

#[cfg(test)]
mod tests {
    use super::{NativeCaptureLaunch, NativeCaptureState};

    #[test]
    fn native_capture_state_tracks_start_and_stop() {
        let state = NativeCaptureState::default();

        let started = state
            .start_with_launcher(
                "session_1".to_string(),
                "http://127.0.0.1:5174/api".to_string(),
                |_, _| NativeCaptureLaunch {
                    child: None,
                    helper_path: Some("sidecar:continuum-native-capture".to_string()),
                    last_error: None,
                },
            )
            .expect("native capture should start");
        assert!(started.running);
        assert_eq!(started.session_id.as_deref(), Some("session_1"));
        assert_eq!(started.helper_path.as_deref(), Some("sidecar:continuum-native-capture"));
        assert_eq!(started.last_error, None);

        let stopped = state.stop().expect("native capture should stop");
        assert!(!stopped.running);
        assert_eq!(stopped.session_id, None);
    }

    #[test]
    fn native_capture_state_reports_launcher_errors() {
        let state = NativeCaptureState::default();

        let started = state
            .start_with_launcher(
                "session_2".to_string(),
                "http://127.0.0.1:5174/api".to_string(),
                |_, _| NativeCaptureLaunch {
                    child: None,
                    helper_path: None,
                    last_error: Some("helper unavailable".to_string()),
                },
            )
            .expect("native capture should enter running state even if helper spawn fails");

        assert!(started.running);
        assert_eq!(started.helper_path, None);
        assert_eq!(started.last_error.as_deref(), Some("helper unavailable"));
    }
}
