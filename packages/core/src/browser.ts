export { CONTINUUM_PRODUCT_NAME } from "./metadata";
export { artifactTypes, captureModes, captureStatuses } from "./domain";
export type {
  ArtifactType,
  CaptureArtifact,
  CaptureMode,
  CapturePermissionState,
  CaptureSession,
  CaptureSource,
  CaptureSourceType,
  CaptureStatus,
  MemoryCard,
  MemoryLink,
  NativeCaptureEventInput,
  ReaderPage,
  RevisionItem
} from "./domain";
import { CONTINUUM_PRODUCT_NAME } from "./metadata";

export type ApiHealth = {
  ok: boolean;
  product: typeof CONTINUUM_PRODUCT_NAME;
  version: string;
};

export type SearchResult = {
  recordType: "memory" | "reader_page" | "artifact";
  recordId: string;
  title: string;
  summary: string;
  snippet: string;
  sourceType: string;
  status: string;
};

export type AskMemoryAnswer = {
  answer: string;
  sources: SearchResult[];
};
