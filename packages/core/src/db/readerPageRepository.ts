import type { Database } from "bun:sqlite";
import type { ReaderPage } from "../domain";
import type { ReaderPageDraft } from "../processing/types";
import { mapReaderPage, type ReaderPageRow } from "./rowMappers";

export function createReaderPage(db: Database, draft: ReaderPageDraft): ReaderPage {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = uniqueSlug(db, draft.slug);
  db.prepare(`
    insert into reader_pages (
      id, page_type, title, slug, summary, content_markdown, source_session_id, topic_key, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    draft.pageType,
    draft.title,
    slug,
    draft.summary,
    draft.contentMarkdown,
    draft.sourceSessionId ?? null,
    draft.topicKey ?? null,
    now,
    now
  );
  const page = getReaderPage(db, id);
  if (!page) {
    throw new Error("Failed to create reader page");
  }
  return page;
}

export function getReaderPage(db: Database, id: string): ReaderPage | undefined {
  const row = db.query<ReaderPageRow, [string]>("select * from reader_pages where id = ?").get(id);
  return row ? mapReaderPage(row) : undefined;
}

export function listReaderPages(db: Database): ReaderPage[] {
  return db.query<ReaderPageRow, []>("select * from reader_pages order by created_at desc").all().map(mapReaderPage);
}

function uniqueSlug(db: Database, slug: string) {
  const existing = db.query<{ count: number }, [string]>("select count(*) as count from reader_pages where slug = ?").get(slug);
  return existing?.count ? `${slug}-${existing.count + 1}` : slug;
}
