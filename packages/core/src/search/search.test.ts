import { expect, test } from "bun:test";
import { createArtifact } from "../db/artifactRepository";
import { createMemoryDatabase } from "../db/connection";
import { createSession } from "../db/sessionRepository";
import { processCapturedSession } from "../processing/processSession";
import { askMemory } from "./askMemory";
import { searchMemory } from "./search";

test("search uses the FTS index across processed memories and pages", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "article", title: "SQLite memory architecture" });
  createArtifact(db, {
    artifactType: "article_text",
    content: "SQLite should be the canonical memory database. Markdown export should be a readable mirror.",
    sessionId: session.id
  });
  await processCapturedSession(db, session.id);

  const results = searchMemory(db, { q: "SQLite" });

  expect(results.length).toBeGreaterThan(0);
  expect(results[0]?.title).toContain("SQLite");
});

test("ask memory synthesizes an answer only from retrieved sources", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "article", title: "Capture UX" });
  createArtifact(db, {
    artifactType: "article_text",
    content: "Intentional capture sessions avoid always-on surveillance and reduce manual note writing.",
    sessionId: session.id
  });
  await processCapturedSession(db, session.id);

  const answer = askMemory(db, "What did I learn about capture?");

  expect(answer.answer).toContain("Intentional capture");
  expect(answer.sources.length).toBeGreaterThan(0);
});
