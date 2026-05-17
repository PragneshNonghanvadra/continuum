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

test("exports suggested session memories and an Obsidian graph when requested", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "research", title: "Graph export session" });
  createArtifact(db, {
    artifactType: "browser_text",
    content: "Knowledge graph exports should connect sessions, generated memories, topics, and links.",
    sessionId: session.id
  });
  await processCapturedSession(db, session.id);

  const exportDir = mkdtempSync(join(tmpdir(), "continuum-graph-export-"));
  const result = exportMarkdownVault(db, { exportDir, includeGraph: true, includeSuggested: true });

  const graphFile = join(exportDir, "Graph", "continuum-graph.json");
  const graphEdgesFile = join(exportDir, "Graph", "continuum-edges.json");
  const graphNodesFile = join(exportDir, "Graph", "continuum-nodes.json");
  const topicClustersFile = join(exportDir, "Graph", "topic-clusters.json");
  const graphMarkdown = join(exportDir, "Graph", "Continuum Knowledge Graph.md");
  const graph = JSON.parse(readFileSync(graphFile, "utf8"));

  expect(result.files).toContain(graphFile);
  expect(result.files).toContain(graphEdgesFile);
  expect(result.files).toContain(graphNodesFile);
  expect(result.files).toContain(topicClustersFile);
  expect(result.files).toContain(graphMarkdown);
  expect(graph.nodes.some((node: { type: string }) => node.type === "session")).toBe(true);
  expect(graph.nodes.some((node: { type: string }) => node.type === "memory")).toBe(true);
  expect(JSON.parse(readFileSync(graphEdgesFile, "utf8"))[0]).toHaveProperty("relation");
  expect(JSON.parse(readFileSync(graphNodesFile, "utf8"))[0]).toHaveProperty("label");
  expect(JSON.parse(readFileSync(topicClustersFile, "utf8"))).toHaveProperty("clusters");
  expect(readFileSync(graphMarkdown, "utf8")).toContain("```mermaid");
});
