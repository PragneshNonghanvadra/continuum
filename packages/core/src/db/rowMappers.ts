import type { CaptureSession } from "../domain";

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
