import { expect, test } from "bun:test";
import { formatAiSettingsSummary, formatAiStatus } from "./aiStatus";

const provider = {
  configured: true,
  endpoint: "http://127.0.0.1:4010/continuum/process",
  id: "codex",
  kind: "codex_app_server",
  label: "Codex app server AI",
  model: "continuum"
} as const;

test("formats strict AI readiness for the desktop header", () => {
  expect(
    formatAiStatus(provider, {
      checkedAt: "2026-05-17T00:00:00.000Z",
      providerId: "codex",
      ready: true,
      strictMode: true
    })
  ).toBe("Strict AI ready");
});

test("formats provider settings with endpoint and model", () => {
  expect(
    formatAiSettingsSummary(provider, {
      checkedAt: "2026-05-17T00:00:00.000Z",
      providerId: "codex",
      ready: true,
      strictMode: true
    })
  ).toContain("Endpoint: http://127.0.0.1:4010/continuum/process.");
});
