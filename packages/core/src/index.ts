export const CONTINUUM_PRODUCT_NAME = "Continuum";

export type ApiHealth = {
  ok: boolean;
  product: typeof CONTINUUM_PRODUCT_NAME;
  version: string;
};

export type {
  ArtifactType,
  CaptureArtifact,
  CaptureMode,
  CaptureSession,
  CaptureStatus,
  CreateArtifactInput,
  CreateImportantMomentInput,
  CreateSessionInput,
  ExtensionPairing,
  ImportantMoment,
  MemoryCard,
  MemoryCategory,
  MemoryLink,
  MemoryType,
  ReaderPage,
  RevisionItem,
  UpdateSessionInput
} from "./domain";
export { artifactTypes, captureModes, captureStatuses } from "./domain";
export { createArtifact, listArtifactsForSession } from "./db/artifactRepository";
export { createMemoryDatabase, openContinuumDatabase } from "./db/connection";
export { ensureContinuumDataDir, getContinuumDataDir, getContinuumDatabasePath } from "./db/dataDirectory";
export { createImportantMoment, listImportantMomentsForSession } from "./db/importantMomentRepository";
export { createExtensionPairing, getExtensionPairingByToken } from "./db/pairingRepository";
export { createMemoryLink, listMemoryLinks, listMemoryLinksForMemory } from "./db/memoryLinkRepository";
export { createMemoryCard, getMemory, listMemories, updateMemory, updateMemoryStatus, type UpdateMemoryInput } from "./db/memoryRepository";
export { createReaderPage, getReaderPage, listReaderPages } from "./db/readerPageRepository";
export { createRevisionItem, getRevisionItem, listRevisionItems, updateRevisionItemStatus } from "./db/revisionRepository";
export { runMigrations } from "./db/migrations";
export { ensureSeedData, seedDevelopmentData } from "./db/seed";
export { createSession, deleteSession, getSession, listSessions, updateSession } from "./db/sessionRepository";
export {
  DisabledCloudTranscriptionProvider,
  MockTranscriptionProvider,
  storeTranscriptArtifact,
  type TranscriptionInput,
  type TranscriptionProvider,
  type TranscriptionResult
} from "./processing/transcription";
export { MockMemoryProcessor } from "./processing/mockMemoryProcessor";
export { processCapturedSession, type PersistedProcessResult } from "./processing/processSession";
export { askMemory, type AskMemoryAnswer } from "./search/askMemory";
export { searchMemory, type SearchFilters, type SearchResult } from "./search/search";
export type {
  LinkDraft,
  MemoryDraft,
  MemoryProcessor,
  ProcessInput,
  ProcessSessionResult,
  ReaderPageDraft,
  RevisionItemDraft
} from "./processing/types";
