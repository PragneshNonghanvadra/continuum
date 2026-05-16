import type { Database } from "bun:sqlite";
import type { MemoryCard } from "../domain";
import type { MemoryDraft } from "../processing/types";
import { mapMemoryCard, type MemoryCardRow } from "./rowMappers";

export type ListMemoryOptions = {
  status?: MemoryCard["status"];
  includeRejected?: boolean;
};

export function createMemoryCard(db: Database, draft: MemoryDraft, sessionId?: string): MemoryCard {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    insert into memory_cards (
      id, session_id, title, summary, full_text, category, memory_type, importance, confidence, status, evidence_json, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'suggested', ?, ?, ?)
  `).run(
    id,
    sessionId ?? null,
    draft.title,
    draft.summary,
    draft.fullText,
    draft.category,
    draft.memoryType,
    draft.importance,
    draft.confidence,
    JSON.stringify(draft.evidence),
    now,
    now
  );
  const memory = getMemory(db, id);
  if (!memory) {
    throw new Error("Failed to create memory card");
  }
  return memory;
}

export function getMemory(db: Database, id: string): MemoryCard | undefined {
  const row = db.query<MemoryCardRow, [string]>("select * from memory_cards where id = ?").get(id);
  return row ? mapMemoryCard(row) : undefined;
}

export function listMemories(db: Database, options: ListMemoryOptions = {}): MemoryCard[] {
  if (options.status) {
    return db
      .query<MemoryCardRow, [string]>("select * from memory_cards where status = ? order by created_at desc")
      .all(options.status)
      .map(mapMemoryCard);
  }

  const where = options.includeRejected ? "" : "where status != 'rejected'";
  return db.query<MemoryCardRow, []>(`select * from memory_cards ${where} order by created_at desc`).all().map(mapMemoryCard);
}

export function updateMemoryStatus(db: Database, id: string, status: MemoryCard["status"]): MemoryCard | undefined {
  db.prepare("update memory_cards set status = ?, updated_at = ? where id = ?").run(status, new Date().toISOString(), id);
  return getMemory(db, id);
}

export type UpdateMemoryInput = Partial<
  Pick<MemoryCard, "category" | "fullText" | "importance" | "memoryType" | "status" | "summary" | "title">
>;

export function updateMemory(db: Database, id: string, input: UpdateMemoryInput): MemoryCard | undefined {
  const existing = getMemory(db, id);
  if (!existing) {
    return undefined;
  }

  const next = {
    category: input.category ?? existing.category,
    fullText: input.fullText ?? existing.fullText,
    importance: input.importance ?? existing.importance,
    memoryType: input.memoryType ?? existing.memoryType,
    status: input.status ?? existing.status,
    summary: input.summary ?? existing.summary,
    title: input.title ?? existing.title,
    updatedAt: new Date().toISOString()
  };

  db.prepare(`
    update memory_cards
    set title = ?, summary = ?, full_text = ?, category = ?, memory_type = ?, importance = ?, status = ?, updated_at = ?
    where id = ?
  `).run(
    next.title,
    next.summary,
    next.fullText,
    next.category,
    next.memoryType,
    next.importance,
    next.status,
    next.updatedAt,
    id
  );

  return getMemory(db, id);
}
