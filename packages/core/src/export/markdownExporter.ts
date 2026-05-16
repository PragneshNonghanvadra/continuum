import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Database } from "bun:sqlite";
import type { MemoryCard, ReaderPage } from "../domain";
import { getContinuumDataDir } from "../db/dataDirectory";
import { listMemoryLinks } from "../db/memoryLinkRepository";
import { listMemories } from "../db/memoryRepository";
import { listReaderPages } from "../db/readerPageRepository";
import { listSessions } from "../db/sessionRepository";

export type MarkdownExportOptions = {
  exportDir?: string;
  includeGraph?: boolean;
  includeSuggested?: boolean;
};

export type MarkdownExportResult = {
  exportDir: string;
  fileCount: number;
  files: string[];
};

export interface MarkdownExporter {
  export(db: Database, options?: MarkdownExportOptions): MarkdownExportResult;
}

export function exportMarkdownVault(db: Database, options: MarkdownExportOptions = {}): MarkdownExportResult {
  const exportDir = options.exportDir ?? join(getContinuumDataDir(), "memory-vault");
  const files: string[] = [];
  const memories = options.includeSuggested ? listMemories(db).filter((memory) => memory.status !== "archived") : listMemories(db, { status: "approved" });
  const pages = listReaderPages(db);
  const links = listMemoryLinks(db);
  const memoryById = new Map(memories.map((memory) => [memory.id, memory]));

  for (const dir of ["Sessions", "Topics", "Revision", "Memories", "Sources", "Graph"]) {
    mkdirSync(join(exportDir, dir), { recursive: true });
  }

  for (const memory of memories) {
    const filePath = join(exportDir, "Memories", `${safeFileName(memory.title)}.md`);
    writeFileSync(filePath, renderMemoryMarkdown(memory, links, memoryById), "utf8");
    files.push(filePath);
  }

  for (const page of pages) {
    const folder = folderForPage(page);
    const filePath = join(exportDir, folder, `${safeFileName(page.title)}.md`);
    writeFileSync(filePath, renderReaderPageMarkdown(page), "utf8");
    files.push(filePath);
  }

  if (options.includeGraph) {
    const graph = buildObsidianGraph(db, memories, pages, links);
    const graphJsonPath = join(exportDir, "Graph", "continuum-graph.json");
    const graphMarkdownPath = join(exportDir, "Graph", "Continuum Knowledge Graph.md");
    writeFileSync(graphJsonPath, JSON.stringify(graph, null, 2), "utf8");
    writeFileSync(graphMarkdownPath, renderGraphMarkdown(graph), "utf8");
    files.push(graphJsonPath, graphMarkdownPath);
  }

  return {
    exportDir,
    fileCount: files.length,
    files
  };
}

type KnowledgeGraph = {
  nodes: Array<{
    id: string;
    label: string;
    type: "session" | "memory" | "reader_page" | "topic";
    status?: string;
    url?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relation: string;
    reason?: string;
  }>;
};

function renderMemoryMarkdown(memory: MemoryCard, links: ReturnType<typeof listMemoryLinks>, memoryById: Map<string, MemoryCard>) {
  const related = links
    .filter((link) => link.sourceMemoryId === memory.id || link.targetMemoryId === memory.id)
    .map((link) => {
      const otherId = link.sourceMemoryId === memory.id ? link.targetMemoryId : link.sourceMemoryId;
      const other = memoryById.get(otherId);
      return other ? `- [[${other.title}]] - ${link.reason}` : undefined;
    })
    .filter(Boolean)
    .join("\n");

  return [
    "---",
    `id: ${memory.id}`,
    `type: ${memory.memoryType}`,
    `category: ${memory.category}`,
    `importance: ${memory.importance}`,
    `status: ${memory.status}`,
    `created_at: ${memory.createdAt}`,
    "---",
    "",
    `# ${memory.title}`,
    "",
    "## Summary",
    "",
    memory.summary,
    "",
    "## Full text",
    "",
    memory.fullText,
    "",
    "## Related memories",
    "",
    related || "- None yet.",
    "",
    "## Source evidence",
    "",
    `Captured from session: ${String(memory.evidence?.sessionId ?? memory.sessionId ?? "unknown")}`
  ].join("\n");
}

function renderReaderPageMarkdown(page: ReaderPage) {
  return [
    "---",
    `id: ${page.id}`,
    `type: ${page.pageType}`,
    `created_at: ${page.createdAt}`,
    "---",
    "",
    page.contentMarkdown
  ].join("\n");
}

function buildObsidianGraph(
  db: Database,
  memories: MemoryCard[],
  pages: ReaderPage[],
  links: ReturnType<typeof listMemoryLinks>
): KnowledgeGraph {
  const sessions = listSessions(db);
  const topics = db
    .query<{ id: string; name: string; slug: string }, []>("select id, name, slug from topics order by name")
    .all();
  const topicMemories = db.query<{ topic_id: string; memory_id: string }, []>("select topic_id, memory_id from topic_memories").all();
  const memoryIds = new Set(memories.map((memory) => memory.id));
  const pageSessionIds = new Set(pages.map((page) => page.sourceSessionId).filter(Boolean));

  const nodes: KnowledgeGraph["nodes"] = [
    ...sessions
      .filter((session) => memories.some((memory) => memory.sessionId === session.id) || pageSessionIds.has(session.id))
      .map((session) => ({
        id: session.id,
        label: session.title,
        status: session.status,
        type: "session" as const,
        url: session.sourceUrl
      })),
    ...memories.map((memory) => ({
      id: memory.id,
      label: memory.title,
      status: memory.status,
      type: "memory" as const
    })),
    ...pages.map((page) => ({
      id: page.id,
      label: page.title,
      type: "reader_page" as const
    })),
    ...topics.map((topic) => ({
      id: topic.id,
      label: topic.name,
      type: "topic" as const
    }))
  ];

  const edges: KnowledgeGraph["edges"] = [
    ...memories
      .filter((memory) => memory.sessionId)
      .map((memory) => ({
        relation: "generated_memory",
        source: memory.sessionId!,
        target: memory.id
      })),
    ...pages
      .filter((page) => page.sourceSessionId)
      .map((page) => ({
        relation: "generated_page",
        source: page.sourceSessionId!,
        target: page.id
      })),
    ...links
      .filter((link) => memoryIds.has(link.sourceMemoryId) && memoryIds.has(link.targetMemoryId))
      .map((link) => ({
        reason: link.reason,
        relation: link.relationType,
        source: link.sourceMemoryId,
        target: link.targetMemoryId
      })),
    ...topicMemories
      .filter((topicMemory) => memoryIds.has(topicMemory.memory_id))
      .map((topicMemory) => ({
        relation: "topic_memory",
        source: topicMemory.topic_id,
        target: topicMemory.memory_id
      }))
  ];

  return { edges, nodes };
}

function renderGraphMarkdown(graph: KnowledgeGraph) {
  const nodeLines = graph.nodes.map((node) => `  ${mermaidId(node.id)}["${escapeMermaid(node.label)}"]`);
  const edgeLines = graph.edges.map(
    (edge) => `  ${mermaidId(edge.source)} -->|"${escapeMermaid(edge.relation)}"| ${mermaidId(edge.target)}`
  );
  const sourceLinks = graph.nodes
    .filter((node) => node.type === "memory" || node.type === "reader_page")
    .map((node) => `- [[${node.label}]]`)
    .join("\n");

  return [
    "---",
    "type: continuum_knowledge_graph",
    "---",
    "",
    "# Continuum Knowledge Graph",
    "",
    "```mermaid",
    "graph TD",
    ...nodeLines,
    ...edgeLines,
    "```",
    "",
    "## Linked pages",
    "",
    sourceLinks || "- No exported memory or reader nodes yet."
  ].join("\n");
}

function folderForPage(page: ReaderPage) {
  if (page.pageType === "session") return "Sessions";
  if (page.pageType === "topic" || page.pageType === "memory_collection") return "Topics";
  if (page.pageType === "revision_pack") return "Revision";
  return "Sources";
}

function safeFileName(value: string) {
  return (
    value
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "Untitled"
  );
}

function mermaidId(value: string) {
  return `n_${value.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function escapeMermaid(value: string) {
  return value.replace(/"/g, "'").slice(0, 80);
}
