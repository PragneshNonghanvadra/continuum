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
