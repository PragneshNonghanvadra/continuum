import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function getContinuumDataDir(env: Record<string, string | undefined> = process.env) {
  return env.CONTINUUM_DATA_DIR ?? join(homedir(), ".continuum");
}

export function ensureContinuumDataDir(env: Record<string, string | undefined> = process.env) {
  const dataDir = getContinuumDataDir(env);
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(join(dataDir, "artifacts"), { recursive: true });
  mkdirSync(join(dataDir, "exports"), { recursive: true });
  return dataDir;
}

export function getContinuumDatabasePath(env: Record<string, string | undefined> = process.env) {
  return join(ensureContinuumDataDir(env), "continuum.sqlite");
}
