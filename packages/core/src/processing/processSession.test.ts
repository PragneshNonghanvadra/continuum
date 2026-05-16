import { existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { createArtifact } from "../db/artifactRepository";
import { createMemoryDatabase } from "../db/connection";
import { listMemories } from "../db/memoryRepository";
import { listReaderPages } from "../db/readerPageRepository";
import { listRevisionItems } from "../db/revisionRepository";
import { createSession, getSession } from "../db/sessionRepository";
import { processCapturedSession } from "./processSession";

test("processes a captured session into persisted memories, reader page, revision items, and FTS rows", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "interview_prep", title: "Frontend performance revision" });
  createArtifact(db, {
    artifactType: "manual_note",
    content:
      "Core Web Vitals, LCP, CLS, INP, bundle splitting, lazy loading, hydration cost, React rendering, caching, and CDN strategy are important frontend interview topics.",
    sessionId: session.id
  });

  const result = await processCapturedSession(db, session.id);

  expect(result.memoryCount).toBeGreaterThan(0);
  expect(listMemories(db, { status: "suggested" })).not.toEqual([]);
  expect(listReaderPages(db)[0]?.title).toBe("Frontend performance revision");
  expect(listRevisionItems(db)[0]?.question).toContain("LCP");
  expect(getSession(db, session.id)?.status).toBe("processed");
  expect(db.query<{ count: number }, []>("select count(*) as count from memory_fts").get()?.count).toBeGreaterThan(0);
});

test("can automatically export session markdown and graph after processing", async () => {
  const db = createMemoryDatabase();
  const exportDir = mkdtempSync(join(tmpdir(), "continuum-auto-export-"));
  const session = createSession(db, { mode: "article", title: "Auto export session" });
  createArtifact(db, {
    artifactType: "article_text",
    content: "Every processed session should leave an Obsidian-readable page and graph trace.",
    sessionId: session.id
  });

  const result = await processCapturedSession(db, session.id, {
    autoExport: true,
    exportDir
  });

  expect(result.exportResult?.fileCount).toBeGreaterThanOrEqual(3);
  expect(existsSync(join(exportDir, "Sessions", "Auto export session.md"))).toBe(true);
  expect(existsSync(join(exportDir, "Graph", "continuum-graph.json"))).toBe(true);
  expect(existsSync(join(exportDir, "Graph", "Continuum Knowledge Graph.md"))).toBe(true);
});
