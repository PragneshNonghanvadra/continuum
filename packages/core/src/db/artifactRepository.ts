import type { Database } from "bun:sqlite";
import type { CaptureArtifact, CreateArtifactInput } from "../domain";
import { artifactTypes } from "../domain";
import { mapCaptureArtifact, type CaptureArtifactRow } from "./rowMappers";

export function createArtifact(db: Database, input: CreateArtifactInput): CaptureArtifact {
  assertArtifactType(input.artifactType);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(`
    insert into capture_artifacts (
      id, session_id, artifact_type, content, file_path, timestamp_start, timestamp_end, metadata_json, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.sessionId,
    input.artifactType,
    input.content ?? null,
    input.filePath ?? null,
    input.timestampStart ?? null,
    input.timestampEnd ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null,
    now
  );

  const artifact = db
    .query<CaptureArtifactRow, [string]>("select * from capture_artifacts where id = ?")
    .get(id);
  if (!artifact) {
    throw new Error("Failed to create capture artifact");
  }
  return mapCaptureArtifact(artifact);
}

export function listArtifactsForSession(db: Database, sessionId: string): CaptureArtifact[] {
  return db
    .query<CaptureArtifactRow, [string]>("select * from capture_artifacts where session_id = ? order by created_at asc")
    .all(sessionId)
    .map(mapCaptureArtifact);
}

function assertArtifactType(artifactType: string) {
  if (!artifactTypes.includes(artifactType as never)) {
    throw new Error(`Unsupported artifact type: ${artifactType}`);
  }
}
