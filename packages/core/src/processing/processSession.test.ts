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
