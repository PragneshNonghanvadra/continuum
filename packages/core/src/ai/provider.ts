export const aiProviderKinds = ["mock", "local", "frontier", "codex_app_server"] as const;

export type AiProviderKind = (typeof aiProviderKinds)[number];

export type AiGenerationRequest = {
  task: string;
  schemaName: string;
  prompt: string;
  input: unknown;
};

export type AiProviderDescription = {
  id: string;
  kind: AiProviderKind;
  label: string;
  configured: boolean;
  endpoint?: string;
  model?: string;
};

export type AiFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface AiGenerationProvider {
  readonly id: string;
  readonly kind: AiProviderKind;
  describe(): AiProviderDescription;
  isConfigured(): boolean;
  generateJson<T>(request: AiGenerationRequest): Promise<T>;
}

export type AiProviderEnvironment = Record<string, string | undefined>;

export type HttpAiProviderOptions = {
  apiKey?: string;
  fetcher?: AiFetch;
  kind: Exclude<AiProviderKind, "mock">;
  model?: string;
  url?: string;
};

export class MockAiProvider implements AiGenerationProvider {
  readonly id = "mock";
  readonly kind = "mock";

  constructor(private readonly options: { configured?: boolean; response?: unknown } = {}) {}

  describe(): AiProviderDescription {
    return {
      configured: this.isConfigured(),
      id: this.id,
      kind: this.kind,
      label: "Deterministic mock AI fallback"
    };
  }

  isConfigured() {
    return this.options.configured ?? false;
  }

  async generateJson<T>(_request: AiGenerationRequest): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error("Mock AI provider is not configured");
    }
    return (this.options.response ?? {}) as T;
  }
}

export class HttpAiProvider implements AiGenerationProvider {
  readonly id: string;
  readonly kind: Exclude<AiProviderKind, "mock">;
  private readonly fetcher: AiFetch;
  private readonly apiKey?: string;
  private readonly model?: string;
  private readonly url?: string;

  constructor(options: HttpAiProviderOptions) {
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.kind = options.kind;
    this.model = options.model;
    this.url = options.url;
    this.id = `${options.kind}:${options.url ?? "unconfigured"}`;
  }

  describe(): AiProviderDescription {
    return {
      configured: this.isConfigured(),
      endpoint: this.url,
      id: this.id,
      kind: this.kind,
      label: labelForKind(this.kind),
      model: this.model
    };
  }

  isConfigured() {
    return Boolean(this.url);
  }

  async generateJson<T>(request: AiGenerationRequest): Promise<T> {
    if (!this.url) {
      throw new Error(`${labelForKind(this.kind)} endpoint is not configured`);
    }

    const response = await this.fetcher(this.url, {
      body: JSON.stringify({
        input: request.input,
        model: this.model,
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
      const detail = await readProviderErrorDetail(response);
      throw new Error(`AI provider request failed with ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    const payload = await response.json();
    return (payload && typeof payload === "object" && "output" in payload ? payload.output : payload) as T;
  }
}

async function readProviderErrorDetail(response: Response) {
  try {
    const text = await response.text();
    if (!text.trim()) return undefined;
    try {
      const payload = JSON.parse(text) as { error?: unknown; message?: unknown };
      const detail = typeof payload.error === "string" ? payload.error : typeof payload.message === "string" ? payload.message : undefined;
      return detail ? truncateDetail(detail) : truncateDetail(text);
    } catch {
      return truncateDetail(text);
    }
  } catch {
    return undefined;
  }
}

function truncateDetail(detail: string) {
  const trimmed = detail.trim();
  return trimmed.length > 300 ? `${trimmed.slice(0, 297)}...` : trimmed;
}

export function createAiProviderFromEnv(env: AiProviderEnvironment = process.env): AiGenerationProvider {
  const enabled = parseBoolean(env.CONTINUUM_AI_ENABLED);
  const rawKind = env.CONTINUUM_AI_PROVIDER ?? "mock";
  const kind = aiProviderKinds.includes(rawKind as AiProviderKind) ? (rawKind as AiProviderKind) : "mock";

  if (!enabled || kind === "mock") {
    return new MockAiProvider({ configured: enabled && kind === "mock" });
  }

  const endpoint = kind === "codex_app_server" ? env.CONTINUUM_CODEX_AI_ENDPOINT ?? env.CONTINUUM_AI_ENDPOINT : env.CONTINUUM_AI_ENDPOINT;
  return new HttpAiProvider({
    apiKey: env.CONTINUUM_AI_API_KEY,
    kind,
    model: env.CONTINUUM_AI_MODEL,
    url: endpoint
  });
}

function parseBoolean(value: string | undefined) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function labelForKind(kind: Exclude<AiProviderKind, "mock">) {
  if (kind === "codex_app_server") return "Codex app server AI";
  if (kind === "frontier") return "Frontier model AI";
  return "Local model AI";
}
