use serde::Serialize;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

#[derive(Default)]
pub struct NativeCaptureState {
    runtime: Mutex<NativeCaptureRuntime>,
}

#[derive(Default)]
struct NativeCaptureRuntime {
    status: NativeCaptureStatus,
    child: Option<Child>,
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

    fn start(&self, session_id: String, api_base_url: String) -> Result<NativeCaptureStatus, String> {
        if session_id.trim().is_empty() {
            return Err("Session id is required to start native capture".to_string());
        }
        if api_base_url.trim().is_empty() {
            return Err("API base URL is required to start native capture".to_string());
        }

        let helper_path = std::env::var("CONTINUUM_NATIVE_HELPER_PATH").ok();
        let mut last_error = None;
        let child = if let Some(path) = helper_path.as_ref() {
            match Command::new(path)
                .arg("run")
                .arg("--session-id")
                .arg(&session_id)
                .arg("--api-base-url")
                .arg(&api_base_url)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
            {
                Ok(child) => Some(child),
                Err(error) => {
                    last_error = Some(format!("Unable to start native helper: {error}"));
                    None
                }
            }
        } else {
            last_error = Some("CONTINUUM_NATIVE_HELPER_PATH is not configured".to_string());
            None
        };
        let status = NativeCaptureStatus {
            api_base_url: Some(api_base_url),
            helper_path,
            last_error,
            running: true,
            session_id: Some(session_id),
        };
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| "Native capture state is unavailable".to_string())?;
        runtime.child = child;
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

#[tauri::command]
pub fn native_capture_status(state: tauri::State<'_, NativeCaptureState>) -> Result<NativeCaptureStatus, String> {
    state.status()
}

#[tauri::command]
pub async fn native_capture_start(
    state: tauri::State<'_, NativeCaptureState>,
    session_id: String,
    api_base_url: String,
) -> Result<NativeCaptureStatus, String> {
    state.start(session_id, api_base_url)
}

#[tauri::command]
pub async fn native_capture_stop(state: tauri::State<'_, NativeCaptureState>) -> Result<NativeCaptureStatus, String> {
    state.stop()
}

#[cfg(test)]
mod tests {
    use super::NativeCaptureState;

    #[test]
    fn native_capture_state_tracks_start_and_stop() {
        let state = NativeCaptureState::default();

        let started = state
            .start("session_1".to_string(), "http://127.0.0.1:5174/api".to_string())
            .expect("native capture should start");
        assert!(started.running);
        assert_eq!(started.session_id.as_deref(), Some("session_1"));

        let stopped = state.stop().expect("native capture should stop");
        assert!(!stopped.running);
        assert_eq!(stopped.session_id, None);
    }
}
