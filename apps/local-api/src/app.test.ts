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
