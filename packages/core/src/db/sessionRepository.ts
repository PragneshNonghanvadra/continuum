import type { Database } from "bun:sqlite";
import type { CaptureSession, CreateSessionInput, UpdateSessionInput } from "../domain";
import { captureModes, captureStatuses } from "../domain";
import { mapCaptureSession, type CaptureSessionRow } from "./rowMappers";

export type GetSessionOptions = {
  includeDeleted?: boolean;
};

export function createSession(db: Database, input: CreateSessionInput): CaptureSession {
  assertCaptureMode(input.mode);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(`
    insert into capture_sessions (
      id, title, mode, status, source_app, source_url, source_title, started_at, ended_at, created_at, updated_at
    ) values (?, ?, ?, 'active', ?, ?, ?, ?, null, ?, ?)
  `).run(
    id,
    input.title.trim(),
    input.mode,
    input.sourceApp ?? null,
    input.sourceUrl ?? null,
    input.sourceTitle ?? null,
    now,
    now,
    now
  );

  const session = getSession(db, id);
  if (!session) {
    throw new Error("Failed to create capture session");
  }
  return session;
}

export function listSessions(db: Database, options: GetSessionOptions = {}): CaptureSession[] {
  const where = options.includeDeleted ? "" : "where status != 'deleted'";
  return db
    .query<CaptureSessionRow, []>(`select * from capture_sessions ${where} order by started_at desc`)
    .all()
    .map(mapCaptureSession);
}

export function getSession(db: Database, id: string, options: GetSessionOptions = {}): CaptureSession | undefined {
  const where = options.includeDeleted ? "id = ?" : "id = ? and status != 'deleted'";
  const row = db.query<CaptureSessionRow, [string]>(`select * from capture_sessions where ${where}`).get(id);
  return row ? mapCaptureSession(row) : undefined;
}

export function updateSession(db: Database, id: string, input: UpdateSessionInput): CaptureSession | undefined {
  if (input.status) {
    assertCaptureStatus(input.status);
  }

  const existing = getSession(db, id, { includeDeleted: true });
  if (!existing) {
    return undefined;
  }

  const next = {
    title: input.title?.trim() ?? existing.title,
    status: input.status ?? existing.status,
    sourceApp: input.sourceApp ?? existing.sourceApp,
    sourceUrl: input.sourceUrl ?? existing.sourceUrl,
    sourceTitle: input.sourceTitle ?? existing.sourceTitle,
    endedAt: input.endedAt ?? existing.endedAt,
    updatedAt: new Date().toISOString()
  };

  db.prepare(`
    update capture_sessions
    set title = ?, status = ?, source_app = ?, source_url = ?, source_title = ?, ended_at = ?, updated_at = ?
    where id = ?
  `).run(
    next.title,
    next.status,
    next.sourceApp ?? null,
    next.sourceUrl ?? null,
    next.sourceTitle ?? null,
    next.endedAt ?? null,
    next.updatedAt,
    id
  );

  return getSession(db, id, { includeDeleted: true });
}

export function deleteSession(db: Database, id: string): CaptureSession | undefined {
  return updateSession(db, id, { status: "deleted", endedAt: new Date().toISOString() });
}

function assertCaptureMode(mode: string) {
  if (!captureModes.includes(mode as never)) {
    throw new Error(`Unsupported capture mode: ${mode}`);
  }
}

function assertCaptureStatus(status: string) {
  if (!captureStatuses.includes(status as never)) {
    throw new Error(`Unsupported capture status: ${status}`);
  }
}
