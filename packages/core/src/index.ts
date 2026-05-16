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
  CreateSessionInput,
  UpdateSessionInput
} from "./domain";
export { artifactTypes, captureModes, captureStatuses } from "./domain";
export { createArtifact, listArtifactsForSession } from "./db/artifactRepository";
export { createMemoryDatabase, openContinuumDatabase } from "./db/connection";
export { ensureContinuumDataDir, getContinuumDataDir, getContinuumDatabasePath } from "./db/dataDirectory";
export { runMigrations } from "./db/migrations";
export { ensureSeedData, seedDevelopmentData } from "./db/seed";
export { createSession, deleteSession, getSession, listSessions, updateSession } from "./db/sessionRepository";
