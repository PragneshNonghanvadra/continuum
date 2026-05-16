import { createAiProviderFromEnv, type AiGenerationProvider } from "../ai/provider";
import { MockMemoryProcessor } from "./mockMemoryProcessor";
import type {
  LinkDraft,
  MemoryDraft,
  MemoryProcessor,
  ProcessInput,
  ProcessSessionResult,
  ReaderPageDraft
} from "./types";

export type AiMemoryProcessorOptions = {
  requireProvider?: boolean;
};

export class AiMemoryProcessor implements MemoryProcessor {
  constructor(
    private readonly provider: AiGenerationProvider = createAiProviderFromEnv(),
    private readonly fallback: MemoryProcessor = new MockMemoryProcessor(),
    private readonly options: AiMemoryProcessorOptions = {}
  ) {}

  async processSession(sessionId: string): Promise<ProcessSessionResult> {
    return this.fallback.processSession(sessionId);
  }

  async process(input: ProcessInput): Promise<ProcessSessionResult> {
    if (!this.provider.isConfigured()) {
      if (this.options.requireProvider) {
        throw new Error("AI provider is required but is not configured.");
      }
      return this.fallback.process(input);
    }

    try {
      const result = await this.provider.generateJson<ProcessSessionResult>({
        input,
        prompt: buildProcessPrompt(input),
        schemaName: "ProcessSessionResult",
        task: "process_session"
      });
      if (!isProcessSessionResult(result)) {
        if (this.options.requireProvider) {
          throw new Error("AI provider returned invalid ProcessSessionResult.");
        }
        return this.fallback.process(input);
      }
      return result;
    } catch (error) {
      if (this.options.requireProvider) {
        throw error instanceof Error ? error : new Error("AI provider failed.");
      }
      return this.fallback.process(input);
    }
  }

  async extractMemories(input: ProcessInput): Promise<MemoryDraft[]> {
    return (await this.process(input)).memories;
  }

  async generateReaderPage(input: ProcessInput): Promise<ReaderPageDraft> {
    return (await this.process(input)).readerPage;
  }

  async generateRevisionPack(input: ProcessInput): Promise<ReaderPageDraft> {
    return this.fallback.generateRevisionPack(input);
  }

  async suggestLinks(memory: MemoryDraft, candidates: ProcessInput["existingMemories"]): Promise<LinkDraft[]> {
    return this.fallback.suggestLinks(memory, candidates);
  }
}

export function createDefaultMemoryProcessor() {
  return new AiMemoryProcessor(createAiProviderFromEnv(), undefined, {
    requireProvider: parseBoolean(process.env.CONTINUUM_AI_REQUIRE_PROVIDER)
  });
}

function parseBoolean(value: string | undefined) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function buildProcessPrompt(input: ProcessInput) {
  return [
    "You are Continuum's memory synthesis engine.",
    "Convert an intentional capture session into useful, cited personal memory.",
    "Return strict JSON matching ProcessSessionResult.",
    "Prefer high-signal memories over raw archival notes.",
    "Every link reason must explain the shared evidence.",
    "",
    `Session title: ${input.session.title}`,
    `Session mode: ${input.session.mode}`,
    `Artifact count: ${input.artifacts.length}`,
    `Existing approved memories available for linking: ${input.existingMemories.length}`
  ].join("\n");
}

function isProcessSessionResult(value: unknown): value is ProcessSessionResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProcessSessionResult>;
  return (
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.memories) &&
    candidate.memories.length > 0 &&
    candidate.memories.every(isMemoryDraft) &&
    isReaderPageDraft(candidate.readerPage) &&
    Array.isArray(candidate.revisionItems) &&
    Array.isArray(candidate.links) &&
    Array.isArray(candidate.tags) &&
    Array.isArray(candidate.entities)
  );
}

function isMemoryDraft(value: unknown): value is MemoryDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MemoryDraft>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.summary === "string" &&
    typeof candidate.fullText === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.memoryType === "string" &&
    typeof candidate.importance === "number" &&
    typeof candidate.confidence === "number" &&
    Boolean(candidate.evidence && typeof candidate.evidence === "object")
  );
}

function isReaderPageDraft(value: unknown): value is ReaderPageDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReaderPageDraft>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.summary === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.contentMarkdown === "string" &&
    typeof candidate.pageType === "string"
  );
}
