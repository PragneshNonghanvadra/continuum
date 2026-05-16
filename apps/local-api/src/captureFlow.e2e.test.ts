import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { createMemoryDatabase } from "@continuum/core";
import { createApiApp } from "./app";

test("complete desktop capture memory flow", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });

  const pairing = await (
    await app.request("/api/extension/pair", {
      body: JSON.stringify({ browserName: "Chrome" }),
      headers: { "content-type": "application/json" },
      method: "POST"
    })
  ).json();

  const sessionPayload = await (
    await app.request("/api/sessions", {
      body: JSON.stringify({ mode: "video", sourceUrl: "https://example.com/watch", title: "Frontend performance video" }),
      headers: { "content-type": "application/json" },
      method: "POST"
    })
  ).json();

  const ingestResponse = await app.request("/api/extension/artifacts", {
    body: JSON.stringify({
      artifacts: [
        {
          artifactType: "browser_visible_text",
          content: "Frontend performance depends on LCP, bundle splitting, lazy loading, and React rendering cost.",
          metadata: { title: "Frontend performance video", url: "https://example.com/watch" }
        },
        {
          artifactType: "video_metadata",
          metadata: { currentTime: 42, duration: 600, title: "Frontend performance video" },
          timestampStart: 42
        }
      ]
    }),
    headers: {
      "content-type": "application/json",
      "x-continuum-pairing-token": pairing.pairing.pairingToken
    },
    method: "POST"
  });
  expect(ingestResponse.status).toBe(201);

  await app.request(`/api/sessions/${sessionPayload.session.id}`, {
    body: JSON.stringify({ endedAt: new Date().toISOString(), status: "processing" }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });

  const processPayload = await (await app.request(`/api/sessions/${sessionPayload.session.id}/process`, { method: "POST" })).json();
  expect(processPayload.memoryCount).toBeGreaterThan(0);

  const memoriesPayload = await (await app.request("/api/memories?status=suggested")).json();
  const memoryId = memoriesPayload.memories[0].id;
  const approvedPayload = await (await app.request(`/api/memories/${memoryId}/approve`, { method: "POST" })).json();
  expect(approvedPayload.memory.status).toBe("approved");

  const pagesPayload = await (await app.request("/api/reader-pages")).json();
  expect(pagesPayload.readerPages[0].contentMarkdown).toContain("## Key Takeaways");

  const askPayload = await (
    await app.request("/api/ask-memory", {
      body: JSON.stringify({ question: "What did I learn about LCP?" }),
      headers: { "content-type": "application/json" },
      method: "POST"
    })
  ).json();
  expect(askPayload.sources.length).toBeGreaterThan(0);

  const exportDir = mkdtempSync(join(tmpdir(), "continuum-e2e-export-"));
  const exportPayload = await (
    await app.request("/api/export/markdown", {
      body: JSON.stringify({ exportDir }),
      headers: { "content-type": "application/json" },
      method: "POST"
    })
  ).json();
  expect(exportPayload.fileCount).toBeGreaterThanOrEqual(2);
});
