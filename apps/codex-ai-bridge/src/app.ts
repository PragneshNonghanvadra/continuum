import { Hono } from "hono";
import type { AiGenerationRequest } from "@continuum/core";
import {
  BridgeProviderError,
  FixtureBridgeProvider,
  createBridgeProviderFromEnv,
  type BridgeGenerationRequest,
  type BridgeProvider
} from "./providers";

export type BridgeAppOptions = {
  provider?: "fixture" | BridgeProvider;
};

export function createBridgeApp(options: BridgeAppOptions = {}) {
  const provider = resolveProvider(options.provider);
  const app = new Hono();

  app.get("/health", (context) =>
    context.json({
      ok: provider.isConfigured(),
      provider: provider.id,
      service: "continuum-codex-ai-bridge"
    })
  );

  app.post("/continuum/process", async (context) => {
    const body = await readJson(context.req);
    if (!isSupportedProcessRequest(body)) {
      return context.json(
        {
          error: "Expected a process_session request with schemaName ProcessSessionResult."
        },
        400
      );
    }

    try {
      const output = await provider.generate(body);
      return context.json({ output });
    } catch (error) {
      if (error instanceof BridgeProviderError) {
        return context.json({ error: error.message }, error.status);
      }
      const message = error instanceof Error ? error.message : "Codex bridge processing failed.";
      return context.json({ error: message }, 500);
    }
  });

  return app;
}

function resolveProvider(provider: BridgeAppOptions["provider"]) {
  if (provider === "fixture") {
    return new FixtureBridgeProvider();
  }
  return provider ?? createBridgeProviderFromEnv();
}

async function readJson(request: { json: () => Promise<unknown> }) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function isSupportedProcessRequest(value: unknown): value is BridgeGenerationRequest {
  if (!isAiGenerationRequest(value)) return false;
  return value.task === "process_session" && value.schemaName === "ProcessSessionResult" && isProcessInput(value.input);
}

function isAiGenerationRequest(value: unknown): value is AiGenerationRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AiGenerationRequest>;
  return (
    typeof candidate.task === "string" &&
    typeof candidate.schemaName === "string" &&
    typeof candidate.prompt === "string" &&
    "input" in candidate
  );
}

function isProcessInput(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    artifacts?: unknown;
    existingMemories?: unknown;
    session?: { id?: unknown; title?: unknown; mode?: unknown };
  };
  const session = candidate.session;
  return (
    Array.isArray(candidate.artifacts) &&
    Array.isArray(candidate.existingMemories) &&
    Boolean(session) &&
    typeof session?.id === "string" &&
    typeof session.title === "string" &&
    typeof session.mode === "string"
  );
}
