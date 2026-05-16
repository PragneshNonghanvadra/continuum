import type { Database } from "bun:sqlite";
import type { RevisionItem } from "../domain";
import type { RevisionItemDraft } from "../processing/types";
import { mapRevisionItem, type RevisionItemRow } from "./rowMappers";

export function createRevisionItem(
  db: Database,
  draft: RevisionItemDraft & { memoryId?: string; readerPageId?: string }
): RevisionItem {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    insert into revision_items (
      id, memory_id, reader_page_id, question, answer, difficulty, status, due_at, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
  `).run(
    id,
    draft.memoryId ?? null,
    draft.readerPageId ?? null,
    draft.question,
    draft.answer ?? null,
    draft.difficulty,
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    now,
    now
  );
  const item = db.query<RevisionItemRow, [string]>("select * from revision_items where id = ?").get(id);
  if (!item) {
    throw new Error("Failed to create revision item");
  }
  return mapRevisionItem(item);
}

export function listRevisionItems(db: Database): RevisionItem[] {
  return db.query<RevisionItemRow, []>("select * from revision_items order by created_at desc").all().map(mapRevisionItem);
}
