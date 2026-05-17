import { describe, expect, it } from "bun:test";
import { createBridgeApp } from "./app";

const now = "2026-05-17T00:00:00.000Z";

const processRequest = {
  input: {
    artifacts: [
      {
        artifactType: "article_text",
        content:
          "AI-first capture should turn browser and native app evidence into memory cards, Obsidian graph exports, and revision material.",
        createdAt: now,
        id: "artifact_1",
        sessionId: "session_1"
      }
    ],
    existingMemories: [],
    session: {
      createdAt: now,
      id: "session_1",
      mode: "article",
      startedAt: now,
      status: "processing",
      title: "AI-first capture architecture",
      updatedAt: now
    }
  },
  model: "continuum-bridge-fixture",
  prompt: "Return strict JSON matching ProcessSessionResult.",
  schemaName: "ProcessSessionResult",
  task: "process_session"
};

describe("codex AI bridge app", () => {
  it("reports bridge health", async () => {
    const app = createBridgeApp({ provider: "fixture" });

    const response = await app.request("/health");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      provider: "fixture",
      service: "continuum-codex-ai-bridge"
    });
  });

  it("processes Continuum session requests into strict output", async () => {
    const app = createBridgeApp({ provider: "fixture" });

    const response = await app.request("/continuum/process", {
      body: JSON.stringify(processRequest),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.output.summary).toContain("AI-first capture");
    expect(payload.output.memories[0].title).toContain("AI-first capture");
    expect(payload.output.readerPage.contentMarkdown).toContain("## Source Evidence");
    expect(payload.output.revisionItems.length).toBeGreaterThan(0);
  });

  it("rejects unsupported tasks", async () => {
    const app = createBridgeApp({ provider: "fixture" });

    const response = await app.request("/continuum/process", {
      body: JSON.stringify({ ...processRequest, task: "summarize_anything" }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });

    expect(response.status).toBe(400);
  });

  it("answers Ask Memory requests from provided sources", async () => {
    const app = createBridgeApp({ provider: "fixture" });

    const response = await app.request("/continuum/process", {
      body: JSON.stringify({
        input: {
          question: "What did I learn about Continuum?",
          sources: [
            {
              recordId: "memory_1",
              recordType: "memory",
              snippet: "Continuum captures explicit sessions and exports an Obsidian graph.",
              sourceType: "memory_card",
              status: "approved",
              summary: "Explicit capture should become linked memory and Obsidian graph output.",
              title: "Continuum explicit capture"
            }
          ]
        },
        prompt: "Answer from local sources only.",
        schemaName: "AskMemoryAnswerDraft",
        task: "ask_memory"
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.output.answer).toContain("Explicit capture");
    expect(payload.output.answer).toContain("Obsidian graph");
  });
});
