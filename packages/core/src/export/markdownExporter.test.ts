import { existsSync, readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { createArtifact } from "../db/artifactRepository";
import { createMemoryDatabase } from "../db/connection";
import { listMemories, updateMemoryStatus } from "../db/memoryRepository";
import { createSession } from "../db/sessionRepository";
import { processCapturedSession } from "../processing/processSession";
import { exportMarkdownVault } from "./markdownExporter";

test("exports approved memories and reader pages into an Obsidian-style vault", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "article", title: "Markdown export session" });
  createArtifact(db, {
    artifactType: "article_text",
    content: "Markdown export should be a readable mirror. SQLite remains the source of truth.",
    sessionId: session.id
  });
  await processCapturedSession(db, session.id);
  const memory = listMemories(db, { status: "suggested" })[0]!;
  updateMemoryStatus(db, memory.id, "approved");

  const exportDir = mkdtempSync(join(tmpdir(), "continuum-export-"));
  const result = exportMarkdownVault(db, { exportDir });

  expect(result.fileCount).toBeGreaterThanOrEqual(2);
  expect(existsSync(join(exportDir, "Memories"))).toBe(true);
  expect(existsSync(join(exportDir, "Sessions"))).toBe(true);

  const memoryMarkdown = readFileSync(result.files.find((file) => file.includes("/Memories/"))!, "utf8");
  expect(memoryMarkdown).toContain("status: approved");
  expect(memoryMarkdown).toContain("## Source evidence");
});
