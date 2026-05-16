import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { runMigrations } from "./migrations";
import { seedDevelopmentData } from "./seed";

test("migrations create memory and capture ingestion tables", () => {
  const db = new Database(":memory:");

  runMigrations(db);

  const tables = db
    .query<{ name: string }, []>("select name from sqlite_master where type in ('table', 'virtual') order by name")
    .all()
    .map((row) => row.name);

  expect(tables).toContain("capture_sessions");
  expect(tables).toContain("capture_artifacts");
  expect(tables).toContain("capture_sources");
  expect(tables).toContain("memory_cards");
  expect(tables).toContain("reader_pages");
  expect(tables).toContain("revision_items");
  expect(tables).toContain("extension_pairings");
  expect(tables).toContain("capture_events");
  expect(tables).toContain("memory_fts");
});

test("seed data loads the PRD example sessions", () => {
  const db = new Database(":memory:");

  runMigrations(db);
  seedDevelopmentData(db);

  const sessions = db
    .query<{ title: string; mode: string }, []>("select title, mode from capture_sessions order by started_at")
    .all();

  expect(sessions).toEqual([
    {
      mode: "article",
      title: "Local-first personal memory architecture"
    },
    {
      mode: "ai_chat",
      title: "Capture UX discussion"
    },
    {
      mode: "interview_prep",
      title: "Frontend performance revision"
    }
  ]);
});
