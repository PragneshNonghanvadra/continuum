import { MockMemoryProcessor, type AiGenerationRequest, type ProcessInput, type ProcessSessionResult } from "@continuum/core";

export type BridgeGenerationRequest = AiGenerationRequest & {
  model?: string;
};

export type AskMemoryAnswerDraft = {
  answer: string;
};

export type BridgeGenerationOutput = AskMemoryAnswerDraft | ProcessSessionResult;

export interface BridgeProvider {
  readonly id: string;
  isConfigured(): boolean;
  generate(request: BridgeGenerationRequest): Promise<BridgeGenerationOutput>;
}

export type HttpBridgeProviderOptions = {
  apiKey?: string;
  fetcher?: typeof fetch;
  model?: string;
  url?: string;
};

export class FixtureBridgeProvider implements BridgeProvider {
  readonly id = "fixture";
  private readonly processor = new MockMemoryProcessor();

  isConfigured() {
    return true;
  }

  async generate(request: BridgeGenerationRequest) {
    if (request.task === "ask_memory") {
      return {
        answer: buildFixtureAskAnswer(request.input)
      };
    }
    return this.processor.process(request.input as ProcessInput);
  }
}

export class HttpBridgeProvider implements BridgeProvider {
  readonly id = "http";
  private readonly apiKey?: string;
  private readonly fetcher: typeof fetch;
  private readonly model?: string;
  private readonly url?: string;

  constructor(options: HttpBridgeProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.model = options.model;
    this.url = options.url;
  }

  isConfigured() {
    return Boolean(this.url);
  }

  async generate(request: BridgeGenerationRequest) {
    if (!this.url) {
      throw new BridgeProviderError("Codex bridge upstream URL is not configured.", 503);
    }

    const response = await this.fetcher(this.url, {
      body: JSON.stringify({
        input: request.input,
        model: request.model ?? this.model,
        prompt: request.prompt,
        schemaName: request.schemaName,
        task: request.task
      }),
      headers: {
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new BridgeProviderError(`Codex bridge upstream failed with ${response.status}.`, 502);
    }

    const payload = await response.json();
    const output = payload && typeof payload === "object" && "output" in payload ? payload.output : payload;
    if (!isValidOutputForSchema(request.schemaName, output)) {
      throw new BridgeProviderError(`Codex bridge upstream returned an invalid ${request.schemaName}.`, 502);
    }
    return output;
  }
}

export class BridgeProviderError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 500 | 502 | 503 = 500
  ) {
    super(message);
  }
}

export function createBridgeProviderFromEnv(env: Record<string, string | undefined> = process.env): BridgeProvider {
  const provider = env.CONTINUUM_CODEX_BRIDGE_PROVIDER ?? "http";
  if (provider === "fixture") {
    return new FixtureBridgeProvider();
  }
  return new HttpBridgeProvider({
    apiKey: env.CONTINUUM_CODEX_BRIDGE_API_KEY ?? env.CONTINUUM_AI_API_KEY,
    model: env.CONTINUUM_CODEX_BRIDGE_MODEL ?? env.CONTINUUM_AI_MODEL,
    url: env.CONTINUUM_CODEX_BRIDGE_UPSTREAM_URL
  });
}

function isProcessSessionResult(value: unknown): value is ProcessSessionResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProcessSessionResult>;
  return (
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.memories) &&
    candidate.memories.length > 0 &&
    Array.isArray(candidate.revisionItems) &&
    Array.isArray(candidate.links) &&
    Array.isArray(candidate.tags) &&
    Array.isArray(candidate.entities) &&
    Boolean(candidate.readerPage && typeof candidate.readerPage === "object")
  );
}

function isAskMemoryAnswerDraft(value: unknown): value is AskMemoryAnswerDraft {
  if (!value || typeof value !== "object") return false;
  return typeof (value as Partial<AskMemoryAnswerDraft>).answer === "string";
}

function isValidOutputForSchema(schemaName: string, output: unknown) {
  if (schemaName === "ProcessSessionResult") return isProcessSessionResult(output);
  if (schemaName === "AskMemoryAnswerDraft") return isAskMemoryAnswerDraft(output);
  return false;
}

function buildFixtureAskAnswer(input: unknown) {
  if (!input || typeof input !== "object") {
    return "I could not find local sources that support an answer.";
  }
  const sources = (input as { sources?: Array<{ summary?: string; snippet?: string; title?: string }> }).sources ?? [];
  if (sources.length === 0) {
    return "I could not find local sources that support an answer.";
  }
  const sourceText = sources
    .map((source) => source.summary || source.snippet || source.title)
    .filter(Boolean)
    .join(" ");
  return `Based on the provided Continuum sources: ${sourceText}`;
}
