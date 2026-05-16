import type { CaptureArtifact, CaptureSession, MemoryCard, MemoryCategory, MemoryType } from "../domain";

export type ProcessInput = {
  session: CaptureSession;
  artifacts: CaptureArtifact[];
  existingMemories: MemoryCard[];
};

export type MemoryDraft = {
  title: string;
  summary: string;
  fullText: string;
  category: MemoryCategory;
  memoryType: MemoryType;
  importance: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  evidence: Record<string, unknown>;
};

export type ReaderPageDraft = {
  pageType: "session" | "topic" | "revision_pack" | "source" | "memory_collection";
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  sourceSessionId?: string;
  topicKey?: string;
};

export type LinkDraft = {
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
};

export type RevisionItemDraft = {
  question: string;
  answer?: string;
  difficulty: "easy" | "medium" | "hard";
};

export type ProcessSessionResult = {
  summary: string;
  memories: MemoryDraft[];
  readerPage: ReaderPageDraft;
  revisionItems: RevisionItemDraft[];
  links: Array<{ sourceDraftTitle: string; links: LinkDraft[] }>;
  tags: string[];
  entities: string[];
};

export interface MemoryProcessor {
  processSession(sessionId: string): Promise<ProcessSessionResult>;
  process(input: ProcessInput): Promise<ProcessSessionResult>;
  extractMemories(input: ProcessInput): Promise<MemoryDraft[]>;
  generateReaderPage(input: ProcessInput): Promise<ReaderPageDraft>;
  generateRevisionPack(input: ProcessInput): Promise<ReaderPageDraft>;
  suggestLinks(memory: MemoryDraft, candidates: MemoryCard[]): Promise<LinkDraft[]>;
}
