import { expect, test } from "bun:test";
import { createMemoryDatabase } from "@continuum/core";
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
