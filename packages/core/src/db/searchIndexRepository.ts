import type { Database } from "bun:sqlite";
import type { CaptureArtifact, CaptureSession, MemoryCard, ReaderPage } from "../domain";

export function indexMemory(db: Database, memory: MemoryCard, session?: CaptureSession) {
  db.prepare(
    "insert into memory_fts (record_type, record_id, title, summary, body, source_type, status) values ('memory', ?, ?, ?, ?, ?, ?)"
  ).run(memory.id, memory.title, memory.summary, memory.fullText, session?.mode ?? "", memory.status);
}

export function indexReaderPage(db: Database, page: ReaderPage, session?: CaptureSession) {
  db.prepare(
    "insert into memory_fts (record_type, record_id, title, summary, body, source_type, status) values ('reader_page', ?, ?, ?, ?, ?, 'approved')"
  ).run(page.id, page.title, page.summary, page.contentMarkdown, session?.mode ?? page.pageType);
}

export function indexArtifact(db: Database, artifact: CaptureArtifact, session?: CaptureSession) {
  if (!artifact.content) {
    return;
  }
  db.prepare(
    "insert into memory_fts (record_type, record_id, title, summary, body, source_type, status) values ('artifact', ?, ?, ?, ?, ?, 'captured')"
  ).run(artifact.id, session?.title ?? artifact.artifactType, artifact.artifactType, artifact.content, session?.mode ?? "");
}
