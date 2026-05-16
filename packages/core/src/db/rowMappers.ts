import type {
  CaptureArtifact,
  CaptureSource,
  CaptureSession,
  ExtensionPairing,
  ImportantMoment,
  MemoryCard,
  MemoryLink,
  ReaderPage,
  RevisionItem
} from "../domain";

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

export type CaptureSourceRow = {
  id: string;
  session_id: string;
  source_type: CaptureSource["sourceType"];
  app_name: string | null;
  bundle_id: string | null;
  window_title: string | null;
  source_url: string | null;
  file_path: string | null;
  capture_capabilities_json: string | null;
  permission_state: CaptureSource["permissionState"];
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
};

export function mapCaptureSource(row: CaptureSourceRow): CaptureSource {
  return {
    appName: row.app_name ?? undefined,
    bundleId: row.bundle_id ?? undefined,
    captureCapabilities: row.capture_capabilities_json ? (JSON.parse(row.capture_capabilities_json) as string[]) : [],
    createdAt: row.created_at,
    filePath: row.file_path ?? undefined,
    id: row.id,
    metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : undefined,
    permissionState: row.permission_state,
    sessionId: row.session_id,
    sourceType: row.source_type,
    sourceUrl: row.source_url ?? undefined,
    updatedAt: row.updated_at,
    windowTitle: row.window_title ?? undefined
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

export type MemoryCardRow = {
  id: string;
  session_id: string | null;
  title: string;
  summary: string;
  full_text: string;
  category: MemoryCard["category"];
  memory_type: MemoryCard["memoryType"];
  importance: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  status: MemoryCard["status"];
  evidence_json: string | null;
  created_at: string;
  updated_at: string;
};

export function mapMemoryCard(row: MemoryCardRow): MemoryCard {
  return {
    id: row.id,
    sessionId: row.session_id ?? undefined,
    title: row.title,
    summary: row.summary,
    fullText: row.full_text,
    category: row.category,
    memoryType: row.memory_type,
    importance: row.importance,
    confidence: row.confidence,
    status: row.status,
    evidence: row.evidence_json ? (JSON.parse(row.evidence_json) as Record<string, unknown>) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export type ReaderPageRow = {
  id: string;
  page_type: ReaderPage["pageType"];
  title: string;
  slug: string;
  summary: string;
  content_markdown: string;
  source_session_id: string | null;
  topic_key: string | null;
  created_at: string;
  updated_at: string;
};

export function mapReaderPage(row: ReaderPageRow): ReaderPage {
  return {
    id: row.id,
    pageType: row.page_type,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    contentMarkdown: row.content_markdown,
    sourceSessionId: row.source_session_id ?? undefined,
    topicKey: row.topic_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export type RevisionItemRow = {
  id: string;
  memory_id: string | null;
  reader_page_id: string | null;
  question: string;
  answer: string | null;
  difficulty: RevisionItem["difficulty"];
  status: RevisionItem["status"];
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapRevisionItem(row: RevisionItemRow): RevisionItem {
  return {
    id: row.id,
    memoryId: row.memory_id ?? undefined,
    readerPageId: row.reader_page_id ?? undefined,
    question: row.question,
    answer: row.answer ?? undefined,
    difficulty: row.difficulty,
    status: row.status,
    dueAt: row.due_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export type MemoryLinkRow = {
  id: string;
  source_memory_id: string;
  target_memory_id: string;
  relation_type: MemoryLink["relationType"];
  score: number;
  reason: string;
  status: MemoryLink["status"];
  created_at: string;
};

export function mapMemoryLink(row: MemoryLinkRow): MemoryLink {
  return {
    id: row.id,
    sourceMemoryId: row.source_memory_id,
    targetMemoryId: row.target_memory_id,
    relationType: row.relation_type,
    score: row.score,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at
  };
}
