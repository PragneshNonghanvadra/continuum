import { expect, test } from "bun:test";
import { canCaptureFromActiveSession, canCaptureFromTab, extensionHeaders } from "./capturePolicy";

test("extension captures only active sessions", () => {
  expect(canCaptureFromActiveSession(undefined)).toBe(false);
  expect(canCaptureFromActiveSession({ id: "s1", status: "paused" })).toBe(false);
  expect(canCaptureFromActiveSession({ id: "s1", status: "active" })).toBe(true);
});

test("extension captures only from the active browser tab", () => {
  expect(canCaptureFromTab({ id: "s1", status: "active" }, 10, 10)).toBe(true);
  expect(canCaptureFromTab({ id: "s1", status: "active" }, 10, 11)).toBe(false);
  expect(canCaptureFromTab({ id: "s1", status: "paused" }, 10, 10)).toBe(false);
  expect(canCaptureFromTab({ id: "s1", status: "active" }, undefined, 10)).toBe(false);
});

test("extension sends pairing token through a local header", () => {
  expect(extensionHeaders("token-123")).toEqual({
    "content-type": "application/json",
    "x-continuum-pairing-token": "token-123"
  });
});
