import type { Database } from "bun:sqlite";
import type { CaptureArtifact } from "../domain";
import { createArtifact } from "../db/artifactRepository";

export type TranscriptionInput = {
  mediaType: "audio" | "video";
  sourceLabel: string;
  filePath?: string;
};

export type TranscriptionResult = {
  text: string;
  provider: string;
  confidence: number;
  language?: string;
};

export interface TranscriptionProvider {
  readonly id: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export type TranscriptionProviderEnvironment = Record<string, string | undefined>;

export type TranscriptionCommandRunner = (
  input: TranscriptionInput,
  command: string,
  args: string[]
) => Promise<{ exitCode: number; stderr: string; stdout: string }>;

export type TranscriptionFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class MockTranscriptionProvider implements TranscriptionProvider {
  readonly id = "mock-local";

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    return {
      confidence: 0.6,
      language: "en",
      provider: this.id,
      text: `Mock transcript for ${input.sourceLabel}. This local placeholder proves the audio and video transcription pipeline without sending media outside Continuum.`
    };
  }
}

export class DisabledCloudTranscriptionProvider implements TranscriptionProvider {
  readonly id = "cloud-disabled";

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new Error("Cloud transcription is disabled until a provider is configured in Settings.");
  }
}

export type LocalCommandTranscriptionProviderOptions = {
  args?: string[];
  command: string;
  runner?: TranscriptionCommandRunner;
};

export class LocalCommandTranscriptionProvider implements TranscriptionProvider {
  readonly id = "local-command";
  private readonly args: string[];
  private readonly command: string;
  private readonly runner: TranscriptionCommandRunner;

  constructor(options: LocalCommandTranscriptionProviderOptions) {
    this.args = options.args ?? [];
    this.command = options.command;
    this.runner = options.runner ?? runLocalCommand;
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (!input.filePath) {
      throw new Error("Local command transcription requires a media file path.");
    }
    const result = await this.runner(input, this.command, [...this.args, input.filePath]);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Transcription command exited with ${result.exitCode}.`);
    }
    return parseTranscriptionOutput(result.stdout, this.id);
  }
}

export type HttpTranscriptionProviderOptions = {
  apiKey?: string;
  fetcher?: TranscriptionFetch;
  url: string;
};

export class HttpTranscriptionProvider implements TranscriptionProvider {
  readonly id = "http";
  private readonly apiKey?: string;
  private readonly fetcher: TranscriptionFetch;
  private readonly url: string;

  constructor(options: HttpTranscriptionProviderOptions) {
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.url = options.url;
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const response = await this.fetcher(this.url, {
      body: JSON.stringify(input),
      headers: {
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        "content-type": "application/json"
      },
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`HTTP transcription failed with ${response.status}.`);
    }
    const payload = await response.json();
    return normalizeTranscriptionResult(payload && typeof payload === "object" && "output" in payload ? payload.output : payload, this.id);
  }
}

export function createTranscriptionProviderFromEnv(env: TranscriptionProviderEnvironment = process.env): TranscriptionProvider {
  const provider = env.CONTINUUM_TRANSCRIPTION_PROVIDER ?? "disabled";
  if (provider === "mock") return new MockTranscriptionProvider();
  if (provider === "local_command" && env.CONTINUUM_TRANSCRIPTION_COMMAND) {
    return new LocalCommandTranscriptionProvider({
      args: splitArgs(env.CONTINUUM_TRANSCRIPTION_ARGS),
      command: env.CONTINUUM_TRANSCRIPTION_COMMAND
    });
  }
  if (provider === "http" && env.CONTINUUM_TRANSCRIPTION_ENDPOINT) {
    return new HttpTranscriptionProvider({
      apiKey: env.CONTINUUM_TRANSCRIPTION_API_KEY,
      url: env.CONTINUUM_TRANSCRIPTION_ENDPOINT
    });
  }
  return new DisabledCloudTranscriptionProvider();
}

export function storeTranscriptArtifact(
  db: Database,
  input: {
    result: TranscriptionResult;
    sessionId: string;
  }
): CaptureArtifact {
  return createArtifact(db, {
    artifactType: "transcript",
    content: input.result.text,
    metadata: {
      confidence: input.result.confidence,
      language: input.result.language,
      provider: input.result.provider
    },
    sessionId: input.sessionId
  });
}

async function runLocalCommand(_input: TranscriptionInput, command: string, args: string[]) {
  const proc = Bun.spawn([command, ...args], {
    stderr: "pipe",
    stdout: "pipe"
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ]);
  return { exitCode, stderr, stdout };
}

function parseTranscriptionOutput(stdout: string, provider: string): TranscriptionResult {
  try {
    return normalizeTranscriptionResult(JSON.parse(stdout), provider);
  } catch {
    return {
      confidence: 0.8,
      provider,
      text: stdout.trim()
    };
  }
}

function normalizeTranscriptionResult(value: unknown, provider: string): TranscriptionResult {
  if (!value || typeof value !== "object") {
    throw new Error("Transcription provider returned an invalid result.");
  }
  const candidate = value as Partial<TranscriptionResult>;
  if (typeof candidate.text !== "string") {
    throw new Error("Transcription provider returned no transcript text.");
  }
  return {
    confidence: typeof candidate.confidence === "number" ? candidate.confidence : 0.8,
    language: typeof candidate.language === "string" ? candidate.language : undefined,
    provider: typeof candidate.provider === "string" ? candidate.provider : provider,
    text: candidate.text
  };
}

function splitArgs(value: string | undefined) {
  return value?.split(" ").map((part) => part.trim()).filter(Boolean) ?? [];
}
