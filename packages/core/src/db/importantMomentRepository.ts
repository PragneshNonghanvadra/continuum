import type { Database } from "bun:sqlite";
import type { CreateImportantMomentInput, ImportantMoment } from "../domain";
import { mapImportantMoment, type ImportantMomentRow } from "./rowMappers";

export function createImportantMoment(db: Database, input: CreateImportantMomentInput): ImportantMoment {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    insert into important_moments (id, session_id, note, source_url, timestamp_seconds, created_at)
    values (?, ?, ?, ?, ?, ?)
  `).run(id, input.sessionId, input.note ?? null, input.sourceUrl ?? null, input.timestampSeconds ?? null, now);

  const row = db.query<ImportantMomentRow, [string]>("select * from important_moments where id = ?").get(id);
  if (!row) {
    throw new Error("Failed to create important moment");
  }
  return mapImportantMoment(row);
}

export function listImportantMomentsForSession(db: Database, sessionId: string): ImportantMoment[] {
  return db
    .query<ImportantMomentRow, [string]>("select * from important_moments where session_id = ? order by created_at asc")
    .all(sessionId)
    .map(mapImportantMoment);
}
