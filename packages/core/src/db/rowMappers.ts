import type { CaptureArtifact, CaptureSession, ExtensionPairing, ImportantMoment } from "../domain";

export type CaptureSessionRow = {
  id: string;
  title: string;
  mode: CaptureSession["mode"];
  status: CaptureSession["status"];
  source_app: string | null;
  source_url: string | null;
  source_title: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapCaptureSession(row: CaptureSessionRow): CaptureSession {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    status: row.status,
    sourceApp: row.source_app ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    sourceTitle: row.source_title ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export type CaptureArtifactRow = {
  id: string;
  session_id: string;
  artifact_type: CaptureArtifact["artifactType"];
  content: string | null;
  file_path: string | null;
  timestamp_start: number | null;
  timestamp_end: number | null;
  metadata_json: string | null;
  created_at: string;
};

export function mapCaptureArtifact(row: CaptureArtifactRow): CaptureArtifact {
  return {
    id: row.id,
    sessionId: row.session_id,
    artifactType: row.artifact_type,
    content: row.content ?? undefined,
    filePath: row.file_path ?? undefined,
    timestampStart: row.timestamp_start ?? undefined,
    timestampEnd: row.timestamp_end ?? undefined,
    metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : undefined,
    createdAt: row.created_at
  };
}

export type ImportantMomentRow = {
  id: string;
  session_id: string;
  note: string | null;
  source_url: string | null;
  timestamp_seconds: number | null;
  created_at: string;
};

export function mapImportantMoment(row: ImportantMomentRow): ImportantMoment {
  return {
    id: row.id,
    sessionId: row.session_id,
    note: row.note ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    timestampSeconds: row.timestamp_seconds ?? undefined,
    createdAt: row.created_at
  };
}

export type ExtensionPairingRow = {
  id: string;
  pairing_token: string;
  browser_name: string;
  status: ExtensionPairing["status"];
  created_at: string;
  updated_at: string;
};

export function mapExtensionPairing(row: ExtensionPairingRow): ExtensionPairing {
  return {
    id: row.id,
    pairingToken: row.pairing_token,
    browserName: row.browser_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
