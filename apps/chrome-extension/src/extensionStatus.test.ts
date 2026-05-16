import { expect, test } from "bun:test";
import { statusLines, type ContinuumExtensionStatus } from "./extensionStatus";

test("extension status explains active capture and accepted artifacts", () => {
  const status: ContinuumExtensionStatus = {
    active: true,
    activeSessionTitle: "Article session",
    lastAcceptedArtifactCount: 3,
    lastCaptureAt: "2026-05-17T00:00:00.000Z",
    lastCheckedAt: "2026-05-17T00:00:00.000Z"
  };

  expect(statusLines(true, status)).toEqual([
    "Connected to Continuum.",
    "Active session: Article session",
    "Last ingest accepted 3 artifacts."
  ]);
});

test("extension status explains missing active sessions and errors", () => {
  const status: ContinuumExtensionStatus = {
    active: false,
    lastCheckedAt: "2026-05-17T00:00:00.000Z",
    lastError: "No active capture session"
  };

  expect(statusLines(true, status)).toEqual([
    "Connected to Continuum.",
    "No active capture session detected.",
    "Last issue: No active capture session"
  ]);
  expect(statusLines(false, status)).toEqual(["Continuum is not reachable.", "Last issue: No active capture session"]);
});
