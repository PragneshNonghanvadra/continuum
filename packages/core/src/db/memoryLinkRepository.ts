import type { Database } from "bun:sqlite";
import type { MemoryLink } from "../domain";
import type { LinkDraft } from "../processing/types";
import { mapMemoryLink, type MemoryLinkRow } from "./rowMappers";

export function createMemoryLink(db: Database, sourceMemoryId: string, draft: LinkDraft): MemoryLink {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    insert into memory_links (
      id, source_memory_id, target_memory_id, relation_type, score, reason, status, created_at
    ) values (?, ?, ?, ?, ?, ?, 'suggested', ?)
  `).run(id, sourceMemoryId, draft.targetMemoryId, draft.relationType, draft.score, draft.reason, now);
  const row = db.query<MemoryLinkRow, [string]>("select * from memory_links where id = ?").get(id);
  if (!row) {
    throw new Error("Failed to create memory link");
  }
  return mapMemoryLink(row);
}

export function listMemoryLinks(db: Database): MemoryLink[] {
  return db.query<MemoryLinkRow, []>("select * from memory_links order by created_at desc").all().map(mapMemoryLink);
}

export function listMemoryLinksForMemory(db: Database, memoryId: string): MemoryLink[] {
  return db
    .query<MemoryLinkRow, [string, string]>(
      "select * from memory_links where source_memory_id = ? or target_memory_id = ? order by score desc, created_at desc"
    )
    .all(memoryId, memoryId)
    .map(mapMemoryLink);
}
