import { expect, test } from "bun:test";
import { canCaptureFromActiveSession, extensionHeaders } from "./capturePolicy";

test("extension captures only active sessions", () => {
  expect(canCaptureFromActiveSession(undefined)).toBe(false);
  expect(canCaptureFromActiveSession({ id: "s1", status: "paused" })).toBe(false);
  expect(canCaptureFromActiveSession({ id: "s1", status: "active" })).toBe(true);
});

test("extension sends pairing token through a local header", () => {
  expect(extensionHeaders("token-123")).toEqual({
    "content-type": "application/json",
    "x-continuum-pairing-token": "token-123"
  });
});
