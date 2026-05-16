export const captureModes = [
  "article",
  "video",
  "audio",
  "ai_chat",
  "interview_prep",
  "research",
  "manual",
  "other"
] as const;

export type CaptureMode = (typeof captureModes)[number];

export const captureStatuses = ["active", "paused", "processing", "processed", "archived", "deleted"] as const;

export type CaptureStatus = (typeof captureStatuses)[number];

export const artifactTypes = [
  "article_text",
  "transcript",
  "ocr_text",
  "screenshot",
  "keyframe",
  "audio_chunk",
  "video_metadata",
  "ai_chat",
  "manual_note",
  "url_metadata",
  "browser_text",
  "browser_selection",
  "browser_visible_text",
  "video_caption",
  "audio_metadata"
] as const;

export type ArtifactType = (typeof artifactTypes)[number];

export type CaptureSession = {
  id: string;
  title: string;
  mode: CaptureMode;
  status: CaptureStatus;
  sourceApp?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSessionInput = {
  title: string;
  mode: CaptureMode;
  sourceApp?: string;
  sourceUrl?: string;
  sourceTitle?: string;
};

export type UpdateSessionInput = Partial<Pick<CaptureSession, "title" | "status" | "sourceApp" | "sourceUrl" | "sourceTitle" | "endedAt">>;

export type CaptureArtifact = {
  id: string;
  sessionId: string;
  artifactType: ArtifactType;
  content?: string;
  filePath?: string;
  timestampStart?: number;
  timestampEnd?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type CreateArtifactInput = {
  sessionId: string;
  artifactType: ArtifactType;
  content?: string;
  filePath?: string;
  timestampStart?: number;
  timestampEnd?: number;
  metadata?: Record<string, unknown>;
};

export type ImportantMoment = {
  id: string;
  sessionId: string;
  note?: string;
  sourceUrl?: string;
  timestampSeconds?: number;
  createdAt: string;
};

export type CreateImportantMomentInput = {
  sessionId: string;
  note?: string;
  sourceUrl?: string;
  timestampSeconds?: number;
};
