import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  CONTINUUM_PRODUCT_NAME,
  AiMemoryProcessor,
  askMemoryWithAi,
  createArtifact,
  createAiProviderFromEnv,
  createCaptureSource,
  createExtensionPairing,
  createImportantMoment,
  createSession,
  deleteSession,
  ingestNativeCaptureEvent,
  listCaptureCapabilities,
  listCaptureSourcesForSession,
  getSession,
  getExtensionPairingByToken,
  getMemory,
  listArtifactsForSession,
  listImportantMomentsForSession,
  listMemoryLinks,
  listMemoryLinksForMemory,
  listMemories,
  listReaderPages,
  listRevisionItems,
  listSessions,
  processCapturedSession,
  searchMemory,
  getReaderPage,
  updateRevisionItemStatus,
  exportMarkdownVault,
  defaultRetentionPolicy,
  updateMemory,
  updateMemoryStatus,
  updateSession,
  type ArtifactType,
  type CaptureArtifact,
  type CaptureMode,
  type CaptureSession,
  type CaptureSourceType,
  type CaptureStatus,
  type CreateCaptureSourceInput,
  type CreateArtifactInput,
  type AiGenerationProvider
} from "@continuum/core";
import { jsonError, readJsonBody } from "./http";

export type ApiAppOptions = {
  db: Database;
  runtime?: {
    aiProvider?: AiGenerationProvider;
    autoExport?: boolean;
    exportDir?: string;
    requireAiProvider?: boolean;
  };
};

export function createApiApp({ db, runtime = {} }: ApiAppOptions) {
  const app = new Hono();
  const aiProvider = runtime.aiProvider ?? createAiProviderFromEnv();
  const requireAiProvider = runtime.requireAiProvider ?? parseBoolean(process.env.CONTINUUM_AI_REQUIRE_PROVIDER);
  const autoExportIfEnabled = () =>
    runtime.autoExport
      ? exportMarkdownVault(db, {
          exportDir: runtime.exportDir,
          includeGraph: true,
          includeSuggested: true
        })
      : undefined;

  app.use(
    "/api/*",
    cors({
      allowHeaders: ["content-type", "x-continuum-pairing-token"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      origin: (origin) => {
        if (!origin) return "*";
        return ["http://127.0.0.1:5173", "http://localhost:5173", "tauri://localhost"].includes(origin) ? origin : "";
      }
    })
  );

  app.get("/api/health", (context) =>
    context.json({
      ok: true,
      product: CONTINUUM_PRODUCT_NAME,
      version: "0.1.0"
    })
  );

  app.post("/api/sessions", async (context) => {
    const body = await readJsonBody<{
      mode?: CaptureMode;
      sourceApp?: string;
      sourceTitle?: string;
      sourceUrl?: string;
      title?: string;
    }>(context);

    if (!body.title || !body.mode) {
      return jsonError(context, 400, "Session title and mode are required");
    }

    try {
      const session = createSession(db, {
        mode: body.mode,
        sourceApp: body.sourceApp,
        sourceTitle: body.sourceTitle,
        sourceUrl: body.sourceUrl,
        title: body.title
      });
      return context.json({ session }, 201);
    } catch (error) {
      return jsonError(context, 400, error instanceof Error ? error.message : "Unable to create session");
    }
  });

  app.get("/api/sessions", (context) => context.json({ sessions: listSessions(db) }));

  app.get("/api/sessions/:id", (context) => {
    const session = getSession(db, context.req.param("id"));
    return session ? context.json({ session }) : jsonError(context, 404, "Session not found");
  });

  app.post("/api/sessions/:id/artifacts", async (context) => {
    const sessionId = context.req.param("id");
    if (!getSession(db, sessionId)) {
      return jsonError(context, 404, "Session not found");
    }

    const body = await readJsonBody<{
      artifactType?: ArtifactType;
      content?: string;
      filePath?: string;
      metadata?: Record<string, unknown>;
      timestampEnd?: number;
      timestampStart?: number;
    }>(context);

    if (!body.artifactType) {
      return jsonError(context, 400, "Artifact type is required");
    }

    try {
      const artifact = createArtifact(db, {
        artifactType: body.artifactType,
        content: body.content,
        filePath: body.filePath,
        metadata: body.metadata,
        sessionId,
        timestampEnd: body.timestampEnd,
        timestampStart: body.timestampStart
      });
      return context.json({ artifact }, 201);
    } catch (error) {
      return jsonError(context, 400, error instanceof Error ? error.message : "Unable to create artifact");
    }
  });

  app.get("/api/sessions/:id/artifacts", (context) => {
    const sessionId = context.req.param("id");
    if (!getSession(db, sessionId)) {
      return jsonError(context, 404, "Session not found");
    }
    return context.json({ artifacts: listArtifactsForSession(db, sessionId) });
  });

  app.post("/api/sessions/:id/transcripts", async (context) => {
    const sessionId = context.req.param("id");
    if (!getSession(db, sessionId)) {
      return jsonError(context, 404, "Session not found");
    }

    const body = await readJsonBody<{
      confidence?: number;
      language?: string;
      provider?: string;
      segments?: Array<{ end?: number; start?: number; text?: string }>;
      text?: string;
    }>(context);
    const segments = body.segments ?? [];
    const content =
      body.text ??
      segments
        .map((segment) => segment.text?.trim())
        .filter(Boolean)
        .join("\n");
    if (!content) {
      return jsonError(context, 400, "Transcript text or segments are required");
    }

    const artifact = createArtifact(db, {
      artifactType: "transcript",
      content,
      metadata: {
        confidence: body.confidence,
        language: body.language,
        provider: body.provider ?? "unknown",
        segmentCount: segments.length,
        segments
      },
      sessionId
    });
    return context.json({ artifact }, 201);
  });

  app.post("/api/sessions/:id/media-events", async (context) => {
    const sessionId = context.req.param("id");
    if (!getSession(db, sessionId)) {
      return jsonError(context, 404, "Session not found");
    }

    const body = await readJsonBody<{
      events?: Array<{
        artifactType?: ArtifactType;
        content?: string;
        filePath?: string;
        metadata?: Record<string, unknown>;
        timestampEnd?: number;
        timestampStart?: number;
      }>;
    }>(context);
    if (!body.events?.length) {
      return jsonError(context, 400, "Media events are required");
    }

    const artifacts = body.events.map((event) =>
      createArtifact(db, {
        artifactType: event.artifactType ?? "system_audio_metadata",
        content: event.content,
        filePath: event.filePath,
        metadata: event.metadata,
        sessionId,
        timestampEnd: event.timestampEnd,
        timestampStart: event.timestampStart
      })
    );

    return context.json({ artifacts }, 201);
  });

  app.get("/api/sessions/:id/capture-diagnostics", (context) => {
    const sessionId = context.req.param("id");
    const session = getSession(db, sessionId);
    if (!session) {
      return jsonError(context, 404, "Session not found");
    }

    const artifacts = listArtifactsForSession(db, sessionId);
    return context.json(buildCaptureDiagnostics(session, artifacts));
  });

  app.post("/api/sessions/:id/sources", async (context) => {
    const sessionId = context.req.param("id");
    if (!getSession(db, sessionId)) {
      return jsonError(context, 404, "Session not found");
    }

    const body = await readJsonBody<Omit<CreateCaptureSourceInput, "sessionId"> & { sourceType?: CaptureSourceType }>(context);
    if (!body.sourceType) {
      return jsonError(context, 400, "Capture source type is required");
    }

    try {
      const source = createCaptureSource(db, {
        ...body,
        sessionId,
        sourceType: body.sourceType
      });
      return context.json({ source }, 201);
    } catch (error) {
      return jsonError(context, 400, error instanceof Error ? error.message : "Unable to create capture source");
    }
  });

  app.get("/api/sessions/:id/sources", (context) => {
    const sessionId = context.req.param("id");
    if (!getSession(db, sessionId)) {
      return jsonError(context, 404, "Session not found");
    }
    return context.json({ sources: listCaptureSourcesForSession(db, sessionId) });
  });

  app.post("/api/sessions/:id/important-moments", async (context) => {
    const sessionId = context.req.param("id");
    if (!getSession(db, sessionId)) {
      return jsonError(context, 404, "Session not found");
    }

    const body = await readJsonBody<{
      note?: string;
      sourceUrl?: string;
      timestampSeconds?: number;
    }>(context);

    const moment = createImportantMoment(db, {
      note: body.note,
      sessionId,
      sourceUrl: body.sourceUrl,
      timestampSeconds: body.timestampSeconds
    });

    return context.json({ moment }, 201);
  });

  app.get("/api/sessions/:id/important-moments", (context) => {
    const sessionId = context.req.param("id");
    if (!getSession(db, sessionId)) {
      return jsonError(context, 404, "Session not found");
    }
    return context.json({ moments: listImportantMomentsForSession(db, sessionId) });
  });

  app.patch("/api/sessions/:id", async (context) => {
    const body = await readJsonBody<{
      endedAt?: string;
      sourceApp?: string;
      sourceTitle?: string;
      sourceUrl?: string;
      status?: CaptureStatus;
      title?: string;
    }>(context);
    const session = updateSession(db, context.req.param("id"), body);
    return session ? context.json({ session }) : jsonError(context, 404, "Session not found");
  });

  app.delete("/api/sessions/:id", (context) => {
    const session = deleteSession(db, context.req.param("id"));
    return session ? context.json({ session }) : jsonError(context, 404, "Session not found");
  });

  app.post("/api/sessions/:id/process", async (context) => {
    try {
      const result = await processCapturedSession(db, context.req.param("id"), {
        autoExport: runtime.autoExport,
        exportDir: runtime.exportDir,
        processor: new AiMemoryProcessor(aiProvider, undefined, {
          requireProvider: requireAiProvider
        })
      });
      return context.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to process session";
      return jsonError(context, statusForProcessError(message), message);
    }
  });

  app.get("/api/memories", (context) => {
    const status = context.req.query("status");
    return context.json({ memories: listMemories(db, status ? { status: status as never } : {}) });
  });

  app.get("/api/memories/:id", (context) => {
    const memory = getMemory(db, context.req.param("id"));
    return memory ? context.json({ memory }) : jsonError(context, 404, "Memory not found");
  });

  app.patch("/api/memories/:id", async (context) => {
    const body = await readJsonBody<Parameters<typeof updateMemory>[2]>(context);
    const memory = updateMemory(db, context.req.param("id"), body);
    return memory ? context.json({ exportResult: autoExportIfEnabled(), memory }) : jsonError(context, 404, "Memory not found");
  });

  app.post("/api/memories/:id/approve", (context) => {
    const memory = updateMemoryStatus(db, context.req.param("id"), "approved");
    return memory ? context.json({ exportResult: autoExportIfEnabled(), memory }) : jsonError(context, 404, "Memory not found");
  });

  app.post("/api/memories/:id/reject", (context) => {
    const memory = updateMemoryStatus(db, context.req.param("id"), "rejected");
    return memory ? context.json({ exportResult: autoExportIfEnabled(), memory }) : jsonError(context, 404, "Memory not found");
  });

  app.get("/api/memories/:id/links", (context) => context.json({ links: listMemoryLinksForMemory(db, context.req.param("id")) }));

  app.get("/api/memory-links", (context) => context.json({ links: listMemoryLinks(db) }));

  app.get("/api/reader-pages", (context) => context.json({ readerPages: listReaderPages(db) }));

  app.get("/api/reader-pages/:id", (context) => {
    const readerPage = getReaderPage(db, context.req.param("id"));
    return readerPage ? context.json({ readerPage }) : jsonError(context, 404, "Reader page not found");
  });

  app.get("/api/search", (context) =>
    context.json({
      results: searchMemory(db, {
        q: context.req.query("q") ?? "",
        sourceMode: context.req.query("sourceMode"),
        status: context.req.query("status")
      })
    })
  );

  app.post("/api/ask-memory", async (context) => {
    const body = await readJsonBody<{ question?: string }>(context);
    if (!body.question) {
      return jsonError(context, 400, "Question is required");
    }
    try {
      return context.json(
        await askMemoryWithAi(db, body.question, {
          provider: aiProvider,
          requireProvider: requireAiProvider
        })
      );
    } catch (error) {
      return jsonError(context, 500, error instanceof Error ? error.message : "Ask Memory failed");
    }
  });

  app.get("/api/revision-items", (context) => context.json({ revisionItems: listRevisionItems(db) }));

  app.patch("/api/revision-items/:id", async (context) => {
    const body = await readJsonBody<{ status?: "new" | "reviewed" | "mastered" | "skipped" }>(context);
    if (!body.status) {
      return jsonError(context, 400, "Revision status is required");
    }
    const revisionItem = updateRevisionItemStatus(db, context.req.param("id"), body.status);
    return revisionItem ? context.json({ revisionItem }) : jsonError(context, 404, "Revision item not found");
  });

  app.post("/api/export/markdown", async (context) => {
    const body = await readJsonBody<{ exportDir?: string }>(context);
    return context.json(exportMarkdownVault(db, { exportDir: body.exportDir, includeGraph: true }));
  });

  app.get("/api/settings/privacy", (context) =>
    context.json({
      retentionPolicy: defaultRetentionPolicy
    })
  );

  app.get("/api/settings/ai", (context) =>
    context.json({
      health: buildAiHealth(aiProvider, requireAiProvider),
      provider: aiProvider.describe()
    })
  );

  app.get("/api/capture/capabilities", (context) =>
    context.json({
      capabilities: listCaptureCapabilities()
    })
  );

  app.post("/api/native-capture/events", async (context) => {
    const body = await readJsonBody<Parameters<typeof ingestNativeCaptureEvent>[1]>(context);
    if (!Array.isArray(body.artifacts)) {
      return jsonError(context, 400, "Artifacts are required");
    }

    try {
      const result = ingestNativeCaptureEvent(db, body);
      return context.json(result, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to ingest native capture event";
      return jsonError(context, message.includes("active capture") ? 404 : 400, message);
    }
  });

  app.post("/api/extension/pair", async (context) => {
    const body = await readJsonBody<{ browserName?: string }>(context);
    const pairing = createExtensionPairing(db, body.browserName ?? "Chrome");
    return context.json({ pairing }, 201);
  });

  app.get("/api/extension/active-session", (context) => {
    const pairingToken = context.req.header("x-continuum-pairing-token");
    if (!pairingToken || !getExtensionPairingByToken(db, pairingToken)) {
      return jsonError(context, 401, "Extension is not paired");
    }

    const activeSession = listSessions(db).find((session) => session.status === "active") ?? null;
    return context.json({ session: activeSession });
  });

  app.post("/api/extension/artifacts", async (context) => {
    const pairingToken = context.req.header("x-continuum-pairing-token");
    if (!pairingToken || !getExtensionPairingByToken(db, pairingToken)) {
      return jsonError(context, 401, "Extension is not paired");
    }

    const activeSession = listSessions(db).find((session) => session.status === "active");
    if (!activeSession) {
      return jsonError(context, 404, "No active capture session");
    }

    const body = await readJsonBody<{
      artifacts?: Array<Omit<CreateArtifactInput, "sessionId">>;
    }>(context);

    const artifacts = (body.artifacts ?? []).map((artifact) =>
      createArtifact(db, {
        ...artifact,
        sessionId: activeSession.id
      })
    );

    return context.json({ artifacts }, 201);
  });

  return app;
}

function buildAiHealth(provider: AiGenerationProvider, strictMode: boolean) {
  const description = provider.describe();
  return {
    checkedAt: new Date().toISOString(),
    providerId: description.id,
    ready: provider.isConfigured(),
    strictMode
  };
}

function parseBoolean(value: string | undefined) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function statusForProcessError(message: string): 404 | 500 | 502 | 503 {
  if (message === "Session not found") return 404;
  if (message.includes("AI provider is required") || message.includes("not configured")) return 503;
  if (message.includes("AI provider request failed with 503")) return 503;
  if (message.includes("AI provider request failed") || message.includes("AI provider returned invalid")) return 502;
  return 500;
}

function buildCaptureDiagnostics(session: CaptureSession, artifacts: CaptureArtifact[]) {
  const artifactTypes = artifacts.reduce<Record<string, number>>((acc, artifact) => {
    acc[artifact.artifactType] = (acc[artifact.artifactType] ?? 0) + 1;
    return acc;
  }, {});
  const capturedTextCharacters = artifacts.reduce((total, artifact) => total + (artifact.content?.length ?? 0), 0);
  const recentArtifacts = [...artifacts]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 12)
    .map((artifact) => ({
      artifactType: artifact.artifactType,
      contentPreview: artifact.content?.replace(/\s+/g, " ").trim().slice(0, 180),
      createdAt: artifact.createdAt,
      id: artifact.id,
      metadata: artifact.metadata,
      sourceUrl: typeof artifact.metadata?.url === "string" ? artifact.metadata.url : undefined
    }));

  return {
    recentArtifacts,
    summary: {
      artifactCount: artifacts.length,
      artifactTypes,
      capturedTextCharacters,
      lastArtifactAt: recentArtifacts[0]?.createdAt,
      state: captureDiagnosticState(session, artifacts.length)
    }
  };
}

function captureDiagnosticState(session: CaptureSession, artifactCount: number) {
  if (session.status === "active") {
    return artifactCount > 0 ? "capturing" : "waiting_for_artifacts";
  }
  if (session.status === "processing") {
    return artifactCount > 0 ? "ready_to_process" : "stopped_without_artifacts";
  }
  return session.status;
}
