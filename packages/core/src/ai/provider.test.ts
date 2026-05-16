import { expect, test } from "bun:test";
import {
  createAiProviderFromEnv,
  HttpAiProvider,
  MockAiProvider
} from "./provider";

test("AI provider config prefers explicit local endpoints", () => {
  const provider = createAiProviderFromEnv({
    CONTINUUM_AI_ENABLED: "true",
    CONTINUUM_AI_ENDPOINT: "http://127.0.0.1:11434/api/generate",
    CONTINUUM_AI_MODEL: "llama3.2",
    CONTINUUM_AI_PROVIDER: "local"
  });

  expect(provider.kind).toBe("local");
  expect(provider.isConfigured()).toBe(true);
  expect(provider.describe().model).toBe("llama3.2");
});

test("AI provider config supports frontier and Codex app server modes", () => {
  const frontier = createAiProviderFromEnv({
    CONTINUUM_AI_API_KEY: "secret",
    CONTINUUM_AI_ENABLED: "true",
    CONTINUUM_AI_ENDPOINT: "https://api.example.test/v1/responses",
    CONTINUUM_AI_MODEL: "frontier-large",
    CONTINUUM_AI_PROVIDER: "frontier"
  });
  const codex = createAiProviderFromEnv({
    CONTINUUM_AI_ENABLED: "true",
    CONTINUUM_AI_ENDPOINT: "http://127.0.0.1:4010/continuum/process",
    CONTINUUM_AI_PROVIDER: "codex_app_server"
  });

  expect(frontier.kind).toBe("frontier");
  expect(frontier.isConfigured()).toBe(true);
  expect(codex.kind).toBe("codex_app_server");
  expect(codex.isConfigured()).toBe(true);
});

test("mock AI provider is the safe deterministic fallback", async () => {
  const provider = new MockAiProvider({ configured: true, response: { ok: true } });

  expect(provider.kind).toBe("mock");
  expect(provider.isConfigured()).toBe(true);
  await expect(provider.generateJson({ input: {}, prompt: "Return JSON", schemaName: "Test", task: "test" })).resolves.toEqual({
    ok: true
  });
});

test("HTTP AI provider unwraps output payloads", async () => {
  const provider = new HttpAiProvider({
    fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body.task).toBe("process_session");
      return new Response(JSON.stringify({ output: { summary: "AI-generated" } }), { status: 200 });
    },
    kind: "local",
    model: "test-model",
    url: "http://127.0.0.1:11434"
  });

  await expect(
    provider.generateJson<{ summary: string }>({
      input: { sessionId: "s1" },
      prompt: "Process this capture session.",
      schemaName: "ProcessSessionResult",
      task: "process_session"
    })
  ).resolves.toEqual({ summary: "AI-generated" });
});

test("HTTP AI provider reports failed generations", async () => {
  const provider = new HttpAiProvider({
    fetcher: async () => new Response("nope", { status: 500 }),
    kind: "frontier",
    url: "https://api.example.test"
  });

  await expect(
    provider.generateJson({
      input: {},
      prompt: "Process this capture session.",
      schemaName: "ProcessSessionResult",
      task: "process_session"
    })
  ).rejects.toThrow("AI provider request failed");
});
