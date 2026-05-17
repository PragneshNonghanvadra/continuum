import { expect, test } from "bun:test";
import { hasNativeCaptureBridge, nativeCaptureStatusRequest, startNativeCaptureRequest } from "./nativeCaptureBridge";

test("native capture bridge reports unavailable outside Tauri", async () => {
  const globalLike = {};

  expect(hasNativeCaptureBridge(globalLike)).toBe(false);
  expect(await nativeCaptureStatusRequest(globalLike)).toEqual({
    available: false,
    reason: "Native capture helper is available in the packaged Tauri desktop app."
  });
});

test("native capture bridge invokes Tauri commands when available", async () => {
  const calls: Array<{ args?: Record<string, unknown>; command: string }> = [];
  const globalLike = {
    __TAURI__: {
      core: {
        invoke: async <T>(command: string, args?: Record<string, unknown>) => {
          calls.push({ args, command });
          return { running: true, sessionId: args?.sessionId } as T;
        }
      }
    }
  };

  const result = await startNativeCaptureRequest("session_1", globalLike);

  expect(result.available).toBe(true);
  expect(calls[0]).toEqual({
    args: {
      apiBaseUrl: "http://127.0.0.1:5174/api",
      sessionId: "session_1"
    },
    command: "native_capture_start"
  });
});
