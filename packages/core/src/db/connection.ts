import { Database } from "bun:sqlite";
import { getContinuumDatabasePath } from "./dataDirectory";
import { runMigrations } from "./migrations";

export function openContinuumDatabase(path = getContinuumDatabasePath()) {
  const db = new Database(path, { create: true });
  runMigrations(db);
  return db;
}

export function createMemoryDatabase() {
  const db = new Database(":memory:");
  runMigrations(db);
  return db;
}
