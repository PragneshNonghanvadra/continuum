import type { Database } from "bun:sqlite";

export type SearchFilters = {
  q: string;
  sourceMode?: string;
  status?: string;
};

export type SearchResult = {
  recordType: "memory" | "reader_page" | "artifact";
  recordId: string;
  title: string;
  summary: string;
  snippet: string;
  sourceType: string;
  status: string;
};

type SearchRow = {
  record_type: SearchResult["recordType"];
  record_id: string;
  title: string;
  summary: string;
  snippet: string;
  source_type: string;
  status: string;
};

export function searchMemory(db: Database, filters: SearchFilters): SearchResult[] {
  const query = toFtsQuery(filters.q);
  if (!query) return [];

  const rows = db
    .query<SearchRow, [string]>(
      `select
        record_type,
        record_id,
        title,
        summary,
        snippet(memory_fts, 4, '', '', '...', 12) as snippet,
        source_type,
        status
      from memory_fts
      where memory_fts match ?
      order by rank
      limit 25`
    )
    .all(query);

  return rows
    .filter((row) => !filters.status || row.status === filters.status)
    .filter((row) => !filters.sourceMode || row.source_type === filters.sourceMode)
    .map((row) => ({
      recordId: row.record_id,
      recordType: row.record_type,
      snippet: row.snippet,
      sourceType: row.source_type,
      status: row.status,
      summary: row.summary,
      title: row.title
    }));
}

function toFtsQuery(input: string) {
  const terms = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);

  return terms.map((term) => `"${term}"`).join(" OR ");
}
