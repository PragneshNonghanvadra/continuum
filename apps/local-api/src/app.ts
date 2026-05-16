import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import {
  CONTINUUM_PRODUCT_NAME,
  createArtifact,
  createExtensionPairing,
  createImportantMoment,
  createSession,
  deleteSession,
  getSession,
  getExtensionPairingByToken,
  getMemory,
  listArtifactsForSession,
  listImportantMomentsForSession,
  listMemoryLinks,
  listMemoryLinksForMemory,
  listMemories,
  listReaderPages,
  listSessions,
  processCapturedSession,
  getReaderPage,
  updateMemory,
  updateMemoryStatus,
  updateSession,
  type ArtifactType,
  type CaptureMode,
  type CaptureStatus,
  type CreateArtifactInput
} from "@continuum/core";
import { jsonError, readJsonBody } from "./http";

export type ApiAppOptions = {
  db: Database;
};

export function createApiApp({ db }: ApiAppOptions) {
  const app = new Hono();

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
      const result = await processCapturedSession(db, context.req.param("id"));
      return context.json(result);
    } catch (error) {
      return jsonError(context, 404, error instanceof Error ? error.message : "Unable to process session");
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
    return memory ? context.json({ memory }) : jsonError(context, 404, "Memory not found");
  });

  app.post("/api/memories/:id/approve", (context) => {
    const memory = updateMemoryStatus(db, context.req.param("id"), "approved");
    return memory ? context.json({ memory }) : jsonError(context, 404, "Memory not found");
  });

  app.post("/api/memories/:id/reject", (context) => {
    const memory = updateMemoryStatus(db, context.req.param("id"), "rejected");
    return memory ? context.json({ memory }) : jsonError(context, 404, "Memory not found");
  });

  app.get("/api/memories/:id/links", (context) => context.json({ links: listMemoryLinksForMemory(db, context.req.param("id")) }));

  app.get("/api/memory-links", (context) => context.json({ links: listMemoryLinks(db) }));

  app.get("/api/reader-pages", (context) => context.json({ readerPages: listReaderPages(db) }));

  app.get("/api/reader-pages/:id", (context) => {
    const readerPage = getReaderPage(db, context.req.param("id"));
    return readerPage ? context.json({ readerPage }) : jsonError(context, 404, "Reader page not found");
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
