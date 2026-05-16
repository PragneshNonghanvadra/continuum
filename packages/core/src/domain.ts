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
  "audio_metadata",
  "native_app_text",
  "native_window_snapshot",
  "document_text",
  "clipboard_text",
  "system_audio_metadata"
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

export const captureSourceTypes = [
  "browser_tab",
  "macos_app",
  "screen_window",
  "system_audio",
  "file_document",
  "clipboard",
  "manual"
] as const;

export type CaptureSourceType = (typeof captureSourceTypes)[number];

export const capturePermissionStates = ["unknown", "not_required", "granted", "denied", "prompt_required"] as const;

export type CapturePermissionState = (typeof capturePermissionStates)[number];

export type CaptureSource = {
  id: string;
  sessionId: string;
  sourceType: CaptureSourceType;
  appName?: string;
  bundleId?: string;
  windowTitle?: string;
  sourceUrl?: string;
  filePath?: string;
  captureCapabilities: string[];
  permissionState: CapturePermissionState;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreateCaptureSourceInput = {
  sessionId: string;
  sourceType: CaptureSourceType;
  appName?: string;
  bundleId?: string;
  windowTitle?: string;
  sourceUrl?: string;
  filePath?: string;
  captureCapabilities?: string[];
  permissionState?: CapturePermissionState;
  metadata?: Record<string, unknown>;
};

export type NativeCaptureEventInput = {
  sessionId?: string;
  source?: Omit<CreateCaptureSourceInput, "sessionId"> & { sessionId?: string };
  artifacts: Array<Omit<CreateArtifactInput, "sessionId">>;
  occurredAt?: string;
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

export type ExtensionPairing = {
  id: string;
  pairingToken: string;
  browserName: string;
  status: "active" | "revoked";
  createdAt: string;
  updatedAt: string;
};

export const memoryCategories = [
  "personal_growth",
  "professional_growth",
  "finance",
  "learning",
  "project",
  "career",
  "idea",
  "health",
  "relationship",
  "other"
] as const;

export type MemoryCategory = (typeof memoryCategories)[number];

export const memoryTypes = [
  "insight",
  "decision",
  "question",
  "todo",
  "resource",
  "learning",
  "reflection",
  "fact",
  "contradiction",
  "goal"
] as const;

export type MemoryType = (typeof memoryTypes)[number];

export type MemoryCard = {
  id: string;
  sessionId?: string;
  title: string;
  summary: string;
  fullText: string;
  category: MemoryCategory;
  memoryType: MemoryType;
  importance: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  status: "suggested" | "approved" | "rejected" | "archived";
  evidence?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ReaderPage = {
  id: string;
  pageType: "session" | "topic" | "revision_pack" | "source" | "memory_collection";
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  sourceSessionId?: string;
  topicKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type MemoryLink = {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationType:
    | "similar_topic"
    | "same_project"
    | "supports"
    | "contradicts"
    | "updates"
    | "expands"
    | "revisits"
    | "derived_from"
    | "same_goal"
    | "same_entity";
  score: number;
  reason: string;
  status: "suggested" | "approved" | "rejected";
  createdAt: string;
};

export type RevisionItem = {
  id: string;
  memoryId?: string;
  readerPageId?: string;
  question: string;
  answer?: string;
  difficulty: "easy" | "medium" | "hard";
  status: "new" | "reviewed" | "mastered" | "skipped";
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
};
