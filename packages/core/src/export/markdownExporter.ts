import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Database } from "bun:sqlite";
import type { MemoryCard, ReaderPage } from "../domain";
import { getContinuumDataDir } from "../db/dataDirectory";
import { listMemoryLinks } from "../db/memoryLinkRepository";
import { listMemories } from "../db/memoryRepository";
import { listReaderPages } from "../db/readerPageRepository";

export type MarkdownExportOptions = {
  exportDir?: string;
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
  const memories = listMemories(db, { status: "approved" });
  const pages = listReaderPages(db);
  const links = listMemoryLinks(db);
  const memoryById = new Map(memories.map((memory) => [memory.id, memory]));

  for (const dir of ["Sessions", "Topics", "Revision", "Memories", "Sources"]) {
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

  return {
    exportDir,
    fileCount: files.length,
    files
  };
}

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
