import { describe, expect, it } from "bun:test";
import { createBridgeApp } from "./app";
import { OpenAiResponsesBridgeProvider } from "./providers";

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

  it("logs provider failure reasons", async () => {
    const logs: string[] = [];
    const app = createBridgeApp({
      logger: lineLogger(logs),
      provider: new OpenAiResponsesBridgeProvider()
    });

    const response = await app.request("/continuum/process", {
      body: JSON.stringify(processRequest),
      headers: { "content-type": "application/json" },
      method: "POST"
    });

    expect(response.status).toBe(503);
    expect(logs.map((line) => JSON.parse(line)).some((entry) => entry.message === "bridge.process_failed" && entry.status === 503)).toBe(true);
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

  it("can call an OpenAI Responses-compatible upstream", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    let capturedHeaders: Headers | undefined;
    let capturedUrl = "";
    const provider = new OpenAiResponsesBridgeProvider({
      apiKey: "test-key",
      fetcher: async (input, init) => {
        capturedUrl = String(input);
        capturedHeaders = new Headers(init?.headers);
        capturedBody = JSON.parse(String(init?.body));
        return Response.json({
          output_text: JSON.stringify({
            entities: [],
            links: [],
            memories: [
              {
                category: "project",
                confidence: 0.94,
                evidence: { artifactIds: ["artifact_1"] },
                fullText: "AI should synthesize capture evidence into memory.",
                importance: 4,
                memoryType: "insight",
                summary: "AI synthesizes capture evidence.",
                title: "AI synthesizes capture evidence"
              }
            ],
            readerPage: {
              contentMarkdown: "# AI reader",
              pageType: "session",
              slug: "ai-reader",
              summary: "AI reader",
              title: "AI reader"
            },
            revisionItems: [],
            summary: "AI summary",
            tags: ["ai"]
          })
        });
      },
      model: "gpt-test"
    });
    const app = createBridgeApp({ provider });

    const response = await app.request("/continuum/process", {
      body: JSON.stringify(processRequest),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(capturedUrl).toBe("https://api.openai.com/v1/responses");
    expect(capturedHeaders?.get("authorization")).toBe("Bearer test-key");
    expect(capturedBody?.model).toBe("continuum-bridge-fixture");
    expect((capturedBody?.text as { format: { type: string } }).format.type).toBe("json_object");
    expect(payload.output.summary).toBe("AI summary");
  });
});

function lineLogger(entries: string[]) {
  return {
    debug: (message: string, metadata?: Record<string, unknown>) => entries.push(JSON.stringify({ ...metadata, message })),
    error: (message: string, metadata?: Record<string, unknown>) => entries.push(JSON.stringify({ ...metadata, message })),
    info: (message: string, metadata?: Record<string, unknown>) => entries.push(JSON.stringify({ ...metadata, message })),
    warn: (message: string, metadata?: Record<string, unknown>) => entries.push(JSON.stringify({ ...metadata, message }))
  };
}
