import { expect, test } from "bun:test";
import { createArtifact } from "../db/artifactRepository";
import { createMemoryDatabase } from "../db/connection";
import { createSession } from "../db/sessionRepository";
import { processCapturedSession } from "../processing/processSession";
import type { AiGenerationProvider, AiGenerationRequest, AiProviderDescription } from "../ai/provider";
import { askMemory, askMemoryWithAi } from "./askMemory";
import { searchMemory } from "./search";

test("search uses the FTS index across processed memories and pages", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "article", title: "SQLite memory architecture" });
  createArtifact(db, {
    artifactType: "article_text",
    content: "SQLite should be the canonical memory database. Markdown export should be a readable mirror.",
    sessionId: session.id
  });
  await processCapturedSession(db, session.id);

  const results = searchMemory(db, { q: "SQLite" });

  expect(results.length).toBeGreaterThan(0);
  expect(results[0]?.title).toContain("SQLite");
});

test("ask memory synthesizes an answer only from retrieved sources", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "article", title: "Capture UX" });
  createArtifact(db, {
    artifactType: "article_text",
    content: "Intentional capture sessions avoid always-on surveillance and reduce manual note writing.",
    sessionId: session.id
  });
  await processCapturedSession(db, session.id);

  const answer = askMemory(db, "What did I learn about capture?");

  expect(answer.answer).toContain("Intentional capture");
  expect(answer.sources.length).toBeGreaterThan(0);
});

test("ask memory can synthesize with a configured AI provider over retrieved sources", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "article", title: "AI-first Continuum" });
  createArtifact(db, {
    artifactType: "article_text",
    content: "Continuum should use AI to turn explicit capture sessions into linked memories and Obsidian graph exports.",
    sessionId: session.id
  });
  await processCapturedSession(db, session.id);
  const provider = new CapturingAskProvider();

  const answer = await askMemoryWithAi(db, "How should Continuum use AI?", { provider });

  expect(answer.answer).toContain("AI synthesis");
  expect(answer.mode).toBe("ai");
  expect(answer.sources.length).toBeGreaterThan(0);
  expect(provider.lastRequest?.task).toBe("ask_memory");
  expect(JSON.stringify(provider.lastRequest?.input)).toContain("Obsidian graph exports");
});

test("ask memory strict mode fails when sources exist but AI is not configured", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "article", title: "Strict AI" });
  createArtifact(db, {
    artifactType: "article_text",
    content: "Strict AI mode should fail instead of silently using deterministic answers.",
    sessionId: session.id
  });
  await processCapturedSession(db, session.id);

  await expect(
    askMemoryWithAi(db, "What should strict AI mode do?", {
      provider: new UnconfiguredAskProvider(),
      requireProvider: true
    })
  ).rejects.toThrow("AI provider is required");
});

class CapturingAskProvider implements AiGenerationProvider {
  readonly id = "test-ai";
  readonly kind = "frontier";
  lastRequest?: AiGenerationRequest;

  describe(): AiProviderDescription {
    return {
      configured: true,
      id: this.id,
      kind: this.kind,
      label: "Test AI"
    };
  }

  isConfigured() {
    return true;
  }

  async generateJson<T>(request: AiGenerationRequest): Promise<T> {
    this.lastRequest = request;
    return { answer: "AI synthesis from cited Continuum sources." } as T;
  }
}

class UnconfiguredAskProvider extends CapturingAskProvider {
  override isConfigured() {
    return false;
  }

  override describe(): AiProviderDescription {
    return {
      configured: false,
      id: this.id,
      kind: this.kind,
      label: "Unconfigured Test AI"
    };
  }
}
