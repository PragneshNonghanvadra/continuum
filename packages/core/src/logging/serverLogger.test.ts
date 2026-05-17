import { expect, test } from "bun:test";
import { createServerLogger } from "./serverLogger";

test("server logger writes structured JSON lines with request metadata", () => {
  const entries: string[] = [];
  const logger = createServerLogger({
    now: () => "2026-05-17T00:00:00.000Z",
    sink: (line) => entries.push(line)
  });

  logger.info("api.request", {
    durationMs: 12,
    method: "POST",
    path: "/api/sessions/session_1/process",
    requestId: "req_1",
    status: 503
  });

  expect(JSON.parse(entries[0] ?? "{}")).toEqual({
    durationMs: 12,
    level: "info",
    message: "api.request",
    method: "POST",
    path: "/api/sessions/session_1/process",
    requestId: "req_1",
    service: "continuum",
    status: 503,
    timestamp: "2026-05-17T00:00:00.000Z"
  });
});

test("server logger redacts secrets from nested metadata", () => {
  const entries: string[] = [];
  const logger = createServerLogger({
    now: () => "2026-05-17T00:00:00.000Z",
    sink: (line) => entries.push(line)
  });

  logger.error("bridge.upstream_failed", {
    authorization: "Bearer secret",
    nested: {
      apiKey: "abc123",
      safe: "visible"
    },
    token: "pairing-token"
  });

  const payload = JSON.parse(entries[0] ?? "{}");
  expect(payload.authorization).toBe("[redacted]");
  expect(payload.nested.apiKey).toBe("[redacted]");
  expect(payload.nested.safe).toBe("visible");
  expect(payload.token).toBe("[redacted]");
});
