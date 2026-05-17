import { Hono } from "hono";
import type { AiGenerationRequest, ServerLogger } from "@continuum/core";
import {
  BridgeProviderError,
  FixtureBridgeProvider,
  createBridgeProviderFromEnv,
  type BridgeGenerationRequest,
  type BridgeProvider
} from "./providers";

export type BridgeAppOptions = {
  logger?: ServerLogger;
  provider?: "fixture" | BridgeProvider;
};

export function createBridgeApp(options: BridgeAppOptions = {}) {
  const provider = resolveProvider(options.provider);
  const logger = options.logger;
  const app = new Hono();

  app.use("*", async (context, next) => {
    const requestId = context.req.header("x-request-id") ?? crypto.randomUUID();
    const startedAt = performance.now();
    context.header("x-continuum-request-id", requestId);
    await next();
    logger?.info("bridge.request", {
      durationMs: Math.round(performance.now() - startedAt),
      method: context.req.method,
      path: new URL(context.req.url).pathname,
      provider: provider.id,
      requestId,
      status: context.res.status
    });
  });

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
        logger?.error("bridge.process_failed", {
          message: error.message,
          provider: provider.id,
          requestId: context.req.header("x-request-id") ?? context.res.headers.get("x-continuum-request-id") ?? "unknown",
          schemaName: body.schemaName,
          status: error.status,
          task: body.task
        });
        return context.json({ error: error.message }, error.status);
      }
      const message = error instanceof Error ? error.message : "Codex bridge processing failed.";
      logger?.error("bridge.process_failed", {
        message,
        provider: provider.id,
        requestId: context.req.header("x-request-id") ?? context.res.headers.get("x-continuum-request-id") ?? "unknown",
        schemaName: body.schemaName,
        status: 500,
        task: body.task
      });
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
  if (value.task === "process_session") {
    return value.schemaName === "ProcessSessionResult" && isProcessInput(value.input);
  }
  if (value.task === "ask_memory") {
    return value.schemaName === "AskMemoryAnswerDraft" && isAskMemoryInput(value.input);
  }
  return false;
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

function isAskMemoryInput(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { question?: unknown; sources?: unknown };
  return typeof candidate.question === "string" && Array.isArray(candidate.sources);
}
