import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import {
  CONTINUUM_PRODUCT_NAME,
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
  type CaptureMode,
  type CaptureStatus
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

  return app;
}
