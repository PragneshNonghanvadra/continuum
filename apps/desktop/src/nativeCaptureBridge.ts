import { API_BASE_URL } from "./api";

export type NativeCaptureStatus = {
  apiBaseUrl?: string;
  helperPath?: string;
  lastError?: string;
  running: boolean;
  sessionId?: string;
};

export type NativeCaptureResult =
  | {
      available: true;
      status: NativeCaptureStatus;
    }
  | {
      available: false;
      reason: string;
    };

type TauriInvoker = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

type TauriGlobal = {
  __TAURI__?: {
    core?: {
      invoke?: TauriInvoker;
    };
  };
  __TAURI_INTERNALS__?: {
    invoke?: TauriInvoker;
  };
};

export function hasNativeCaptureBridge(globalLike: TauriGlobal = globalThis as TauriGlobal) {
  return Boolean(resolveInvoker(globalLike));
}

export async function nativeCaptureStatusRequest(globalLike: TauriGlobal = globalThis as TauriGlobal): Promise<NativeCaptureResult> {
  const invoke = resolveInvoker(globalLike);
  if (!invoke) {
    return { available: false, reason: "Native capture helper is available in the packaged Tauri desktop app." };
  }
  return {
    available: true,
    status: await invoke<NativeCaptureStatus>("native_capture_status")
  };
}

export async function startNativeCaptureRequest(
  sessionId: string,
  globalLike: TauriGlobal = globalThis as TauriGlobal
): Promise<NativeCaptureResult> {
  const invoke = resolveInvoker(globalLike);
  if (!invoke) {
    return { available: false, reason: "Native capture helper is available in the packaged Tauri desktop app." };
  }
  return {
    available: true,
    status: await invoke<NativeCaptureStatus>("native_capture_start", {
      apiBaseUrl: API_BASE_URL,
      sessionId
    })
  };
}

export async function stopNativeCaptureRequest(globalLike: TauriGlobal = globalThis as TauriGlobal): Promise<NativeCaptureResult> {
  const invoke = resolveInvoker(globalLike);
  if (!invoke) {
    return { available: false, reason: "Native capture helper is available in the packaged Tauri desktop app." };
  }
  return {
    available: true,
    status: await invoke<NativeCaptureStatus>("native_capture_stop")
  };
}

function resolveInvoker(globalLike: TauriGlobal): TauriInvoker | undefined {
  return globalLike.__TAURI__?.core?.invoke ?? globalLike.__TAURI_INTERNALS__?.invoke;
}
