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
