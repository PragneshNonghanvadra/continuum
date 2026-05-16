import { expect, test } from "bun:test";
import { defaultRetentionPolicy } from "./retention";

test("raw audio and video retention is disabled by default", () => {
  expect(defaultRetentionPolicy.retainRawAudio).toBe(false);
  expect(defaultRetentionPolicy.retainRawVideo).toBe(false);
  expect(defaultRetentionPolicy.exportRequiresUserAction).toBe(true);
  expect(defaultRetentionPolicy.captureRequiresExplicitSession).toBe(true);
});
