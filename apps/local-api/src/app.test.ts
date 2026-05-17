import { expect, test } from "bun:test";
import { createMemoryDatabase, type AiGenerationProvider, type AiGenerationRequest, type AiProviderDescription } from "@continuum/core";
import { createApiApp } from "./app";

test("session API creates, lists, patches, and soft-deletes sessions", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });

  const createdResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "article", sourceUrl: "https://example.com", title: "API capture" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  expect(createdResponse.status).toBe(201);
  const created = await createdResponse.json();
  expect(created.session.status).toBe("active");

  const listResponse = await app.request("/api/sessions");
  const listed = await listResponse.json();
  expect(listed.sessions).toHaveLength(1);

  const patchResponse = await app.request(`/api/sessions/${created.session.id}`, {
    body: JSON.stringify({ status: "paused" }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  expect(patchResponse.status).toBe(200);
  expect((await patchResponse.json()).session.status).toBe("paused");

  const deleteResponse = await app.request(`/api/sessions/${created.session.id}`, { method: "DELETE" });
  expect(deleteResponse.status).toBe(200);

  const hiddenResponse = await app.request("/api/sessions");
  expect((await hiddenResponse.json()).sessions).toEqual([]);
});

test("API allows local desktop web shell requests", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const response = await app.request("/api/health", {
    headers: { origin: "http://127.0.0.1:5173" }
  });

  expect(response.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
});

test("artifact API ingests and lists session artifacts", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const createdSessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "ai_chat", title: "AI exploration" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await createdSessionResponse.json();

  const artifactResponse = await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({
      artifactType: "ai_chat",
      content: "User: explain indexing\nAssistant: FTS is useful.",
      metadata: { source: "browser" }
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  expect(artifactResponse.status).toBe(201);
  expect((await artifactResponse.json()).artifact.artifactType).toBe("ai_chat");

  const listResponse = await app.request(`/api/sessions/${session.id}/artifacts`);
  const listed = await listResponse.json();
  expect(listed.artifacts).toHaveLength(1);
  expect(listed.artifacts[0].metadata).toEqual({ source: "browser" });
});

test("important moment API stores explicit user markers", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "research", title: "Research session" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();

  const markerResponse = await app.request(`/api/sessions/${session.id}/important-moments`, {
    body: JSON.stringify({ note: "Keep this decision", sourceUrl: "https://example.com", timestampSeconds: 10 }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  expect(markerResponse.status).toBe(201);
  expect((await markerResponse.json()).moment.note).toBe("Keep this decision");
});

test("extension API pairs and exposes only active capture sessions", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const pairingResponse = await app.request("/api/extension/pair", {
    body: JSON.stringify({ browserName: "Chrome" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { pairing } = await pairingResponse.json();

  const emptyActiveResponse = await app.request("/api/extension/active-session", {
    headers: { "x-continuum-pairing-token": pairing.pairingToken }
  });
  expect((await emptyActiveResponse.json()).session).toBeNull();

  await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "article", title: "Extension capture" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  const activeResponse = await app.request("/api/extension/active-session", {
    headers: { "x-continuum-pairing-token": pairing.pairingToken }
  });
  expect((await activeResponse.json()).session.title).toBe("Extension capture");
});

test("extension artifact ingest writes to the active session only", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const pairingResponse = await app.request("/api/extension/pair", {
    body: JSON.stringify({ browserName: "Chrome" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { pairing } = await pairingResponse.json();
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "video", title: "Video evidence" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();

  const ingestResponse = await app.request("/api/extension/artifacts", {
    body: JSON.stringify({
      artifacts: [
        {
          artifactType: "browser_visible_text",
          content: "Visible explanation",
          metadata: { url: "https://example.com/watch" }
        },
        {
          artifactType: "video_metadata",
          metadata: { currentTime: 12, duration: 120, title: "Demo video" },
          timestampStart: 12
        }
      ]
    }),
    headers: {
      "content-type": "application/json",
      "x-continuum-pairing-token": pairing.pairingToken
    },
    method: "POST"
  });

  expect(ingestResponse.status).toBe(201);
  expect((await ingestResponse.json()).artifacts).toHaveLength(2);

  const artifactsResponse = await app.request(`/api/sessions/${session.id}/artifacts`);
  expect((await artifactsResponse.json()).artifacts.map((artifact: { artifactType: string }) => artifact.artifactType)).toEqual([
    "browser_visible_text",
    "video_metadata"
  ]);
});

test("session capture diagnostics summarize whether evidence is arriving", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "article", title: "Diagnostics capture" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();

  const emptyPayload = await (await app.request(`/api/sessions/${session.id}/capture-diagnostics`)).json();
  expect(emptyPayload.summary.state).toBe("waiting_for_artifacts");
  expect(emptyPayload.summary.artifactCount).toBe(0);

  await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({
      artifactType: "browser_visible_text",
      content: "An article about explicit capture sessions and meaningful memory synthesis.",
      metadata: { title: "Capture article", url: "https://example.com/article" }
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({
      artifactType: "url_metadata",
      metadata: { title: "Capture article", url: "https://example.com/article" }
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  const payload = await (await app.request(`/api/sessions/${session.id}/capture-diagnostics`)).json();
  expect(payload.summary.state).toBe("capturing");
  expect(payload.summary.artifactCount).toBe(2);
  expect(payload.summary.artifactTypes.browser_visible_text).toBe(1);
  expect(payload.summary.artifactTypes.url_metadata).toBe(1);
  expect(payload.summary.capturedTextCharacters).toBeGreaterThan(20);
  expect(payload.summary.lastArtifactAt).toBeString();
  expect(payload.recentArtifacts.map((artifact: { artifactType: string }) => artifact.artifactType)).toContain("url_metadata");
  expect(payload.recentArtifacts.map((artifact: { artifactType: string }) => artifact.artifactType)).toContain("browser_visible_text");
});

test("process session API converts captured artifacts into suggested memories", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "article", title: "Local-first memory" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();
  await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({
      artifactType: "article_text",
      content: "SQLite should be the canonical memory database. Markdown export should be a readable mirror."
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  const processResponse = await app.request(`/api/sessions/${session.id}/process`, { method: "POST" });
  expect(processResponse.status).toBe(200);
  expect((await processResponse.json()).memoryCount).toBeGreaterThan(0);

  const memoriesResponse = await app.request("/api/memories?status=suggested");
  expect((await memoriesResponse.json()).memories[0].status).toBe("suggested");
});

test("memory review API edits, approves, rejects, and archives suggested cards", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "article", title: "Review session" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();
  await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({ artifactType: "article_text", content: "SQLite should remain the canonical database." }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  await app.request(`/api/sessions/${session.id}/process`, { method: "POST" });
  const memories = await (await app.request("/api/memories?status=suggested")).json();
  const memoryId = memories.memories[0].id;

  const patchResponse = await app.request(`/api/memories/${memoryId}`, {
    body: JSON.stringify({ title: "SQLite remains canonical" }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  expect((await patchResponse.json()).memory.title).toBe("SQLite remains canonical");

  const approveResponse = await app.request(`/api/memories/${memoryId}/approve`, { method: "POST" });
  expect((await approveResponse.json()).memory.status).toBe("approved");

  const rejectResponse = await app.request(`/api/memories/${memoryId}/reject`, { method: "POST" });
  expect((await rejectResponse.json()).memory.status).toBe("rejected");

  const archiveResponse = await app.request(`/api/memories/${memoryId}`, {
    body: JSON.stringify({ status: "archived" }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  expect((await archiveResponse.json()).memory.status).toBe("archived");
});

test("reader page API lists generated session pages", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "article", title: "Reader session" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();
  await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({ artifactType: "article_text", content: "Browser capture creates reader pages." }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  await app.request(`/api/sessions/${session.id}/process`, { method: "POST" });

  const pagesResponse = await app.request("/api/reader-pages");
  const pages = await pagesResponse.json();

  expect(pages.readerPages[0].title).toBe("Reader session");
  expect(pages.readerPages[0].contentMarkdown).toContain("## Key Takeaways");
});

test("search and ask-memory API return source-backed retrieval results", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "article", title: "Search session" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();
  await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({ artifactType: "article_text", content: "Frontend performance depends on LCP and bundle splitting." }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  await app.request(`/api/sessions/${session.id}/process`, { method: "POST" });

  const searchPayload = await (await app.request("/api/search?q=LCP")).json();
  expect(searchPayload.results.length).toBeGreaterThan(0);

  const askPayload = await (
    await app.request("/api/ask-memory", {
      body: JSON.stringify({ question: "What did I learn about frontend performance?" }),
      headers: { "content-type": "application/json" },
      method: "POST"
    })
  ).json();
  expect(askPayload.sources.length).toBeGreaterThan(0);
  expect(askPayload.answer).toContain("Based on");
});

test("ask-memory API can synthesize with configured AI provider", async () => {
  const provider = new ApiAskProvider();
  const app = createApiApp({
    db: createMemoryDatabase(),
    runtime: {
      aiProvider: provider
    }
  });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "article", title: "AI Ask session" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();
  await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({ artifactType: "article_text", content: "AI Ask Memory should cite local evidence before synthesis." }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  await app.request(`/api/sessions/${session.id}/process`, { method: "POST" });

  const askPayload = await (
    await app.request("/api/ask-memory", {
      body: JSON.stringify({ question: "How should Ask Memory behave?" }),
      headers: { "content-type": "application/json" },
      method: "POST"
    })
  ).json();

  expect(askPayload.mode).toBe("ai");
  expect(askPayload.answer).toContain("API AI synthesis");
  expect(provider.lastRequest?.task).toBe("ask_memory");
});

test("revision API lists generated questions and updates review status", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "interview_prep", title: "Revision session" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();
  await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({ artifactType: "manual_note", content: "LCP and bundle splitting are frontend interview topics." }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  await app.request(`/api/sessions/${session.id}/process`, { method: "POST" });

  const listPayload = await (await app.request("/api/revision-items")).json();
  const itemId = listPayload.revisionItems[0].id;

  const updatePayload = await (
    await app.request(`/api/revision-items/${itemId}`, {
      body: JSON.stringify({ status: "mastered" }),
      headers: { "content-type": "application/json" },
      method: "PATCH"
    })
  ).json();

  expect(updatePayload.revisionItem.status).toBe("mastered");
});

test("markdown export API writes approved memories and reader pages", async () => {
  const exportDir = `/tmp/continuum-api-export-${crypto.randomUUID()}`;
  const app = createApiApp({ db: createMemoryDatabase() });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "article", title: "Export session" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();
  await app.request(`/api/sessions/${session.id}/artifacts`, {
    body: JSON.stringify({ artifactType: "article_text", content: "Markdown vault export mirrors approved memory." }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  await app.request(`/api/sessions/${session.id}/process`, { method: "POST" });
  const memoriesPayload = await (await app.request("/api/memories?status=suggested")).json();
  await app.request(`/api/memories/${memoriesPayload.memories[0].id}/approve`, { method: "POST" });

  const exportPayload = await (
    await app.request("/api/export/markdown", {
      body: JSON.stringify({ exportDir }),
      headers: { "content-type": "application/json" },
      method: "POST"
    })
  ).json();

  expect(exportPayload.fileCount).toBeGreaterThanOrEqual(2);
});

test("privacy settings API exposes local retention defaults", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const payload = await (await app.request("/api/settings/privacy")).json();

  expect(payload.retentionPolicy.retainRawAudio).toBe(false);
  expect(payload.retentionPolicy.retainRawVideo).toBe(false);
  expect(payload.retentionPolicy.captureRequiresExplicitSession).toBe(true);
});

test("AI settings API exposes provider mode without secrets", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const payload = await (await app.request("/api/settings/ai")).json();

  expect(payload.provider.kind).toBe("mock");
  expect(payload.health.ready).toBe(false);
  expect(payload.health.strictMode).toBe(false);
  expect(payload.provider).not.toHaveProperty("apiKey");
});

test("AI settings API reports strict provider health", async () => {
  const app = createApiApp({
    db: createMemoryDatabase(),
    runtime: {
      aiProvider: new ApiAskProvider(),
      requireAiProvider: true
    }
  });
  const payload = await (await app.request("/api/settings/ai")).json();

  expect(payload.health.ready).toBe(true);
  expect(payload.health.strictMode).toBe(true);
  expect(payload.health.providerId).toBe("api-test-ai");
});

test("capture capabilities API includes browser and native capture surfaces", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const payload = await (await app.request("/api/capture/capabilities")).json();

  expect(payload.capabilities.some((capability: { sourceType: string }) => capability.sourceType === "browser_tab")).toBe(true);
  expect(payload.capabilities.some((capability: { sourceType: string }) => capability.sourceType === "macos_app")).toBe(true);
  expect(payload.capabilities.some((capability: { sourceType: string }) => capability.sourceType === "system_audio")).toBe(true);
});

test("native capture API ingests non-browser artifacts into the active session", async () => {
  const app = createApiApp({ db: createMemoryDatabase() });
  const sessionResponse = await app.request("/api/sessions", {
    body: JSON.stringify({ mode: "research", title: "Native Preview capture" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const { session } = await sessionResponse.json();

  const ingestResponse = await app.request("/api/native-capture/events", {
    body: JSON.stringify({
      artifacts: [
        {
          artifactType: "document_text",
          content: "Preview extracted text from a downloaded PDF without manual upload."
        }
      ],
      source: {
        appName: "Preview",
        captureCapabilities: ["document_text", "ocr_text"],
        filePath: "/Users/me/Downloads/local.pdf",
        permissionState: "granted",
        sourceType: "file_document",
        windowTitle: "local.pdf"
      }
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  expect(ingestResponse.status).toBe(201);
  const payload = await ingestResponse.json();
  expect(payload.session.id).toBe(session.id);
  expect(payload.source.sourceType).toBe("file_document");
  expect(payload.artifacts[0].artifactType).toBe("document_text");

  const sourcesPayload = await (await app.request(`/api/sessions/${session.id}/sources`)).json();
  expect(sourcesPayload.sources[0].appName).toBe("Preview");
});

class ApiAskProvider implements AiGenerationProvider {
  readonly id = "api-test-ai";
  readonly kind = "codex_app_server";
  lastRequest?: AiGenerationRequest;

  describe(): AiProviderDescription {
    return {
      configured: true,
      endpoint: "http://127.0.0.1:4010/continuum/process",
      id: this.id,
      kind: this.kind,
      label: "API Test AI",
      model: "test-model"
    };
  }

  isConfigured() {
    return true;
  }

  async generateJson<T>(request: AiGenerationRequest): Promise<T> {
    this.lastRequest = request;
    if (request.task === "ask_memory") {
      return { answer: "API AI synthesis from local Continuum evidence." } as T;
    }
    throw new Error(`Unsupported task ${request.task}`);
  }
}
