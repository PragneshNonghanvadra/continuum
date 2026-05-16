import type { Database } from "bun:sqlite";
import type { CaptureArtifact, CaptureSource, CreateCaptureSourceInput, NativeCaptureEventInput } from "../domain";
import { capturePermissionStates, captureSourceTypes } from "../domain";
import { createArtifact } from "./artifactRepository";
import { mapCaptureSource, type CaptureSourceRow } from "./rowMappers";
import { getSession, listSessions } from "./sessionRepository";

export type NativeCaptureEventResult = {
  artifacts: CaptureArtifact[];
  session: NonNullable<ReturnType<typeof getSession>>;
  source?: CaptureSource;
};

export function createCaptureSource(db: Database, input: CreateCaptureSourceInput): CaptureSource {
  assertCaptureSourceType(input.sourceType);
  assertPermissionState(input.permissionState ?? "unknown");

  if (!getSession(db, input.sessionId)) {
    throw new Error("Session not found");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    insert into capture_sources (
      id, session_id, source_type, app_name, bundle_id, window_title, source_url, file_path,
      capture_capabilities_json, permission_state, metadata_json, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.sessionId,
    input.sourceType,
    input.appName ?? null,
    input.bundleId ?? null,
    input.windowTitle ?? null,
    input.sourceUrl ?? null,
    input.filePath ?? null,
    JSON.stringify(input.captureCapabilities ?? []),
    input.permissionState ?? "unknown",
    input.metadata ? JSON.stringify(input.metadata) : null,
    now,
    now
  );

  const row = db.query<CaptureSourceRow, [string]>("select * from capture_sources where id = ?").get(id);
  if (!row) {
    throw new Error("Failed to create capture source");
  }
  return mapCaptureSource(row);
}

export function listCaptureSourcesForSession(db: Database, sessionId: string): CaptureSource[] {
  return db
    .query<CaptureSourceRow, [string]>("select * from capture_sources where session_id = ? order by created_at asc")
    .all(sessionId)
    .map(mapCaptureSource);
}

export function ingestNativeCaptureEvent(db: Database, input: NativeCaptureEventInput): NativeCaptureEventResult {
  const sessionId = input.sessionId ?? input.source?.sessionId ?? listSessions(db).find((session) => session.status === "active")?.id;
  if (!sessionId) {
    throw new Error("No active capture session");
  }

  const session = getSession(db, sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const source = input.source
    ? createCaptureSource(db, {
        ...input.source,
        sessionId
      })
    : undefined;

  const artifacts = input.artifacts.map((artifact) =>
    createArtifact(db, {
      ...artifact,
      metadata: {
        ...(artifact.metadata ?? {}),
        ...(source
          ? {
              captureSourceId: source.id,
              captureSourceType: source.sourceType
            }
          : {})
      },
      sessionId
    })
  );

  recordCaptureEvent(db, {
    eventType: source ? `native_${source.sourceType}` : "native_capture",
    metadata: {
      artifactCount: artifacts.length,
      captureSourceId: source?.id,
      occurredAt: input.occurredAt
    },
    sessionId,
    sourceTitle: source?.windowTitle,
    sourceUrl: source?.sourceUrl
  });

  return { artifacts, session, source };
}

export function listCaptureCapabilities() {
  return [
    {
      artifactTypes: ["browser_text", "browser_selection", "browser_visible_text", "video_caption", "video_metadata", "keyframe"],
      permissionNotes: "Requires a paired Chrome extension and an active Continuum session.",
      sourceType: "browser_tab"
    },
    {
      artifactTypes: ["native_app_text", "native_window_snapshot", "ocr_text", "screenshot"],
      permissionNotes: "Requires macOS Accessibility and Screen Recording permissions for desktop app capture.",
      sourceType: "macos_app"
    },
    {
      artifactTypes: ["native_window_snapshot", "ocr_text", "keyframe"],
      permissionNotes: "Requires explicit session capture plus macOS Screen Recording permission.",
      sourceType: "screen_window"
    },
    {
      artifactTypes: ["system_audio_metadata", "audio_metadata", "transcript"],
      permissionNotes: "Uses metadata and transcript artifacts; raw audio retention remains disabled by default.",
      sourceType: "system_audio"
    },
    {
      artifactTypes: ["document_text", "ocr_text", "url_metadata"],
      permissionNotes: "Supports Preview/PDF/document readers through extracted text or OCR artifacts.",
      sourceType: "file_document"
    },
    {
      artifactTypes: ["clipboard_text", "manual_note"],
      permissionNotes: "Only captured during an explicit active session.",
      sourceType: "clipboard"
    }
  ] satisfies Array<{ artifactTypes: string[]; permissionNotes: string; sourceType: string }>;
}

function recordCaptureEvent(
  db: Database,
  input: {
    eventType: string;
    metadata?: Record<string, unknown>;
    sessionId: string;
    sourceTitle?: string;
    sourceUrl?: string;
  }
) {
  const now = new Date().toISOString();
  db.prepare(`
    insert into capture_events (
      id, session_id, event_type, source_url, source_title, metadata_json, occurred_at, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    input.sessionId,
    input.eventType,
    input.sourceUrl ?? null,
    input.sourceTitle ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null,
    now,
    now
  );
}

function assertCaptureSourceType(sourceType: string) {
  if (!captureSourceTypes.includes(sourceType as never)) {
    throw new Error(`Unsupported capture source type: ${sourceType}`);
  }
}

function assertPermissionState(permissionState: string) {
  if (!capturePermissionStates.includes(permissionState as never)) {
    throw new Error(`Unsupported permission state: ${permissionState}`);
  }
}
