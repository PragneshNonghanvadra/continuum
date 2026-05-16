export const CONTINUUM_PRODUCT_NAME = "Continuum";

export type ApiHealth = {
  ok: boolean;
  product: typeof CONTINUUM_PRODUCT_NAME;
  version: string;
};

export { createMemoryDatabase, openContinuumDatabase } from "./db/connection";
export { ensureContinuumDataDir, getContinuumDataDir, getContinuumDatabasePath } from "./db/dataDirectory";
export { runMigrations } from "./db/migrations";
export { ensureSeedData, seedDevelopmentData } from "./db/seed";
