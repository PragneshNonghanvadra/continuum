import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { createMemoryDatabase } from "@continuum/core";
import { createApiApp } from "./app";

test("complete desktop capture memory flow", async () => {
  const autoExportDir = mkdtempSync(join(tmpdir(), "continuum-auto-e2e-export-"));
  const app = createApiApp({
    db: createMemoryDatabase(),
    runtime: {
      autoExport: true,
      exportDir: autoExportDir
    }
  });

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

  const nativeResponse = await app.request("/api/native-capture/events", {
    body: JSON.stringify({
      artifacts: [
        {
          artifactType: "document_text",
          content: "Preview captured downloaded notes about hydration cost and local native capture."
        }
      ],
      source: {
        appName: "Preview",
        captureCapabilities: ["document_text", "ocr_text"],
        permissionState: "granted",
        sourceType: "file_document",
        windowTitle: "frontend-notes.pdf"
      }
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  expect(nativeResponse.status).toBe(201);

  const transcriptResponse = await app.request(`/api/sessions/${sessionPayload.session.id}/transcripts`, {
    body: JSON.stringify({
      confidence: 0.9,
      language: "en",
      provider: "local-command",
      segments: [{ end: 52, start: 45, text: "Hydration cost matters in downloaded technical videos." }]
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  expect(transcriptResponse.status).toBe(201);

  const mediaResponse = await app.request(`/api/sessions/${sessionPayload.session.id}/media-events`, {
    body: JSON.stringify({
      events: [
        {
          artifactType: "video_caption",
          content: "Hydration cost matters.",
          timestampEnd: 52,
          timestampStart: 45
        }
      ]
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  expect(mediaResponse.status).toBe(201);

  await app.request(`/api/sessions/${sessionPayload.session.id}`, {
    body: JSON.stringify({ endedAt: new Date().toISOString(), status: "processing" }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });

  const processPayload = await (await app.request(`/api/sessions/${sessionPayload.session.id}/process`, { method: "POST" })).json();
  expect(processPayload.memoryCount).toBeGreaterThan(0);
  expect(processPayload.exportResult.exportDir).toBe(autoExportDir);

  const memoriesPayload = await (await app.request("/api/memories?status=suggested")).json();
  const memoryId = memoriesPayload.memories[0].id;
  const approvedPayload = await (await app.request(`/api/memories/${memoryId}/approve`, { method: "POST" })).json();
  expect(approvedPayload.memory.status).toBe("approved");
  expect(approvedPayload.exportResult.fileCount).toBeGreaterThan(0);

  const pagesPayload = await (await app.request("/api/reader-pages")).json();
  expect(pagesPayload.readerPages[0].contentMarkdown).toContain("## Key Takeaways");
  expect(pagesPayload.readerPages[0].contentMarkdown).toContain("## Media Timeline");

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
  expect(exportPayload.files.some((file: string) => file.endsWith("Graph/continuum-graph.json"))).toBe(true);
});
