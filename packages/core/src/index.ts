export { CONTINUUM_PRODUCT_NAME } from "./metadata";

import { CONTINUUM_PRODUCT_NAME } from "./metadata";

export type ApiHealth = {
  ok: boolean;
  product: typeof CONTINUUM_PRODUCT_NAME;
  version: string;
};

export type {
  ArtifactType,
  CaptureArtifact,
  CaptureMode,
  CapturePermissionState,
  CaptureSession,
  CaptureSource,
  CaptureSourceType,
  CaptureStatus,
  CreateArtifactInput,
  CreateCaptureSourceInput,
  CreateImportantMomentInput,
  CreateSessionInput,
  ExtensionPairing,
  ImportantMoment,
  MemoryCard,
  MemoryCategory,
  MemoryLink,
  MemoryType,
  NativeCaptureEventInput,
  ReaderPage,
  RevisionItem,
  UpdateSessionInput
} from "./domain";
export { artifactTypes, captureModes, capturePermissionStates, captureSourceTypes, captureStatuses } from "./domain";
export { createArtifact, listArtifactsForSession } from "./db/artifactRepository";
export {
  createCaptureSource,
  ingestNativeCaptureEvent,
  listCaptureCapabilities,
  listCaptureSourcesForSession,
  type NativeCaptureEventResult
} from "./db/captureSourceRepository";
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
  aiProviderKinds,
  createAiProviderFromEnv,
  HttpAiProvider,
  MockAiProvider,
  type AiGenerationProvider,
  type AiGenerationRequest,
  type AiProviderDescription,
  type AiProviderEnvironment,
  type AiProviderKind
} from "./ai/provider";
export {
  DisabledCloudTranscriptionProvider,
  HttpTranscriptionProvider,
  LocalCommandTranscriptionProvider,
  MockTranscriptionProvider,
  createTranscriptionProviderFromEnv,
  storeTranscriptArtifact,
  type TranscriptionCommandRunner,
  type TranscriptionInput,
  type TranscriptionProvider,
  type TranscriptionProviderEnvironment,
  type TranscriptionResult
} from "./processing/transcription";
export { MockMemoryProcessor } from "./processing/mockMemoryProcessor";
export { AiMemoryProcessor, createDefaultMemoryProcessor, type AiMemoryProcessorOptions } from "./processing/aiMemoryProcessor";
export { processCapturedSession, type PersistedProcessResult, type ProcessCapturedSessionOptions } from "./processing/processSession";
export { exportMarkdownVault, type MarkdownExporter, type MarkdownExportOptions, type MarkdownExportResult } from "./export/markdownExporter";
export { defaultRetentionPolicy, type RetentionPolicy } from "./privacy/retention";
export { askMemory, askMemoryWithAi, type AskMemoryAnswer, type AskMemoryWithAiOptions } from "./search/askMemory";
export {
  DisabledEmbeddingProvider,
  MockEmbeddingProvider,
  listStoredEmbeddings,
  searchStoredEmbeddings,
  storeEmbedding,
  type EmbeddingProvider,
  type EmbeddingRecordType,
  type EmbeddingSearchResult,
  type StoreEmbeddingInput,
  type StoredEmbedding
} from "./search/embeddings";
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
