import { expect, test } from "bun:test";
import type { CaptureArtifact, CaptureSession } from "../domain";
import type { AiGenerationProvider, AiGenerationRequest } from "../ai/provider";
import { AiMemoryProcessor } from "./aiMemoryProcessor";
import type { ProcessSessionResult } from "./types";

const session: CaptureSession = {
  createdAt: "2026-05-16T00:00:00.000Z",
  id: "session_ai",
  mode: "research",
  startedAt: "2026-05-16T00:00:00.000Z",
  status: "processing",
  title: "AI-first processing",
  updatedAt: "2026-05-16T00:00:00.000Z"
};

const artifacts: CaptureArtifact[] = [
  {
    artifactType: "browser_text",
    content: "The AI provider should transform captured sessions into rich memories with cited evidence.",
    createdAt: "2026-05-16T00:00:00.000Z",
    id: "artifact_ai",
    sessionId: session.id
  }
];

const aiResult: ProcessSessionResult = {
  entities: ["AI Provider"],
  links: [],
  memories: [
    {
      category: "project",
      confidence: 0.91,
      evidence: { artifactIds: ["artifact_ai"], provider: "recording" },
      fullText: "AI provider processing is the primary path for meaningful session synthesis.",
      importance: 5,
      memoryType: "decision",
      summary: "AI-first processing should synthesize captured evidence into useful memories.",
      title: "AI provider processing is primary"
    }
  ],
  readerPage: {
    contentMarkdown: "# AI-first processing\n\n## Summary\nAI-generated synthesis.",
    pageType: "session",
    slug: "ai-first-processing",
    sourceSessionId: session.id,
    summary: "AI-generated synthesis.",
    title: "AI-first processing"
  },
  revisionItems: [],
  summary: "AI-generated synthesis.",
  tags: ["ai-first"]
};

test("AI memory processor uses configured provider output", async () => {
  const provider = new RecordingAiProvider(aiResult);
  const processor = new AiMemoryProcessor(provider);

  const result = await processor.process({ artifacts, existingMemories: [], session });

  expect(result.summary).toBe("AI-generated synthesis.");
  expect(result.memories[0]?.title).toBe("AI provider processing is primary");
  expect(provider.requests[0]?.task).toBe("process_session");
  expect(provider.requests[0]?.schemaName).toBe("ProcessSessionResult");
});

test("AI memory processor falls back when provider is not configured", async () => {
  const provider = new RecordingAiProvider(aiResult, false);
  const processor = new AiMemoryProcessor(provider);

  const result = await processor.process({ artifacts, existingMemories: [], session });

  expect(result.summary).toContain("AI provider should transform");
  expect(result.readerPage.contentMarkdown).toContain("## Key Takeaways");
  expect(provider.requests).toHaveLength(0);
});

test("AI memory processor falls back when provider returns invalid JSON shape", async () => {
  const provider = new RecordingAiProvider({ memories: [] });
  const processor = new AiMemoryProcessor(provider);

  const result = await processor.process({ artifacts, existingMemories: [], session });

  expect(result.memories.length).toBeGreaterThan(0);
  expect(result.readerPage.title).toBe("AI-first processing");
});

test("AI memory processor can require a configured provider", async () => {
  const provider = new RecordingAiProvider(aiResult, false);
  const processor = new AiMemoryProcessor(provider, undefined, { requireProvider: true });

  await expect(processor.process({ artifacts, existingMemories: [], session })).rejects.toThrow("AI provider is required");
});

test("AI memory processor fails strict mode on invalid provider output", async () => {
  const provider = new RecordingAiProvider({ memories: [] });
  const processor = new AiMemoryProcessor(provider, undefined, { requireProvider: true });

  await expect(processor.process({ artifacts, existingMemories: [], session })).rejects.toThrow("AI provider returned invalid");
});

class RecordingAiProvider implements AiGenerationProvider {
  readonly id = "recording";
  readonly kind = "mock" as const;
  requests: AiGenerationRequest[] = [];

  constructor(private readonly response: unknown, private readonly configured = true) {}

  describe() {
    return {
      configured: this.configured,
      id: this.id,
      kind: this.kind,
      label: "Recording AI provider"
    };
  }

  isConfigured() {
    return this.configured;
  }

  async generateJson<T>(request: AiGenerationRequest): Promise<T> {
    this.requests.push(request);
    return this.response as T;
  }
}
