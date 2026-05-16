import type { Database } from "bun:sqlite";

export function runMigrations(db: Database) {
  db.exec("pragma foreign_keys = on;");
  db.exec(`
    create table if not exists capture_sessions (
      id text primary key,
      title text not null,
      mode text not null,
      status text not null,
      source_app text,
      source_url text,
      source_title text,
      started_at text not null,
      ended_at text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists capture_artifacts (
      id text primary key,
      session_id text not null references capture_sessions(id),
      artifact_type text not null,
      content text,
      file_path text,
      timestamp_start real,
      timestamp_end real,
      metadata_json text,
      created_at text not null
    );

    create table if not exists capture_sources (
      id text primary key,
      session_id text not null references capture_sessions(id),
      source_type text not null,
      app_name text,
      bundle_id text,
      window_title text,
      source_url text,
      file_path text,
      capture_capabilities_json text,
      permission_state text not null,
      metadata_json text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists memory_cards (
      id text primary key,
      session_id text references capture_sessions(id),
      title text not null,
      summary text not null,
      full_text text not null,
      category text not null,
      memory_type text not null,
      importance integer not null,
      confidence real not null,
      status text not null,
      evidence_json text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists memory_links (
      id text primary key,
      source_memory_id text not null references memory_cards(id),
      target_memory_id text not null references memory_cards(id),
      relation_type text not null,
      score real not null,
      reason text not null,
      status text not null default 'suggested',
      created_at text not null
    );

    create table if not exists reader_pages (
      id text primary key,
      page_type text not null,
      title text not null,
      slug text not null unique,
      summary text not null,
      content_markdown text not null,
      source_session_id text references capture_sessions(id),
      topic_key text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists topics (
      id text primary key,
      name text not null,
      slug text not null unique,
      description text,
      category text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists topic_memories (
      topic_id text not null references topics(id),
      memory_id text not null references memory_cards(id),
      created_at text not null,
      primary key (topic_id, memory_id)
    );

    create table if not exists tags (
      id text primary key,
      name text not null,
      slug text not null unique,
      created_at text not null
    );

    create table if not exists memory_tags (
      memory_id text not null references memory_cards(id),
      tag_id text not null references tags(id),
      created_at text not null,
      primary key (memory_id, tag_id)
    );

    create table if not exists entities (
      id text primary key,
      name text not null,
      entity_type text not null,
      created_at text not null,
      unique (name, entity_type)
    );

    create table if not exists memory_entities (
      memory_id text not null references memory_cards(id),
      entity_id text not null references entities(id),
      created_at text not null,
      primary key (memory_id, entity_id)
    );

    create table if not exists revision_items (
      id text primary key,
      memory_id text references memory_cards(id),
      reader_page_id text references reader_pages(id),
      question text not null,
      answer text,
      difficulty text not null,
      status text not null,
      due_at text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists extension_pairings (
      id text primary key,
      pairing_token text not null,
      browser_name text not null,
      status text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists capture_events (
      id text primary key,
      session_id text not null references capture_sessions(id),
      event_type text not null,
      source_url text,
      source_title text,
      metadata_json text,
      occurred_at text not null,
      created_at text not null
    );

    create table if not exists media_chunks (
      id text primary key,
      session_id text not null references capture_sessions(id),
      source_url text,
      media_type text not null,
      file_path text,
      transcript_artifact_id text references capture_artifacts(id),
      retained integer not null default 0,
      started_at text not null,
      ended_at text,
      created_at text not null
    );

    create table if not exists keyframes (
      id text primary key,
      session_id text not null references capture_sessions(id),
      source_url text,
      file_path text not null,
      ocr_text text,
      timestamp_seconds real,
      created_at text not null
    );

    create table if not exists important_moments (
      id text primary key,
      session_id text not null references capture_sessions(id),
      note text,
      source_url text,
      timestamp_seconds real,
      created_at text not null
    );

    create virtual table if not exists memory_fts using fts5(
      record_type,
      record_id unindexed,
      title,
      summary,
      body,
      source_type,
      status unindexed
    );

    create index if not exists capture_sessions_status_idx on capture_sessions(status);
    create index if not exists capture_artifacts_session_idx on capture_artifacts(session_id);
    create index if not exists capture_sources_session_idx on capture_sources(session_id);
    create index if not exists capture_sources_type_idx on capture_sources(source_type);
    create index if not exists memory_cards_status_idx on memory_cards(status);
    create index if not exists memory_cards_session_idx on memory_cards(session_id);
    create index if not exists reader_pages_source_session_idx on reader_pages(source_session_id);
    create index if not exists revision_items_status_idx on revision_items(status);
    create index if not exists capture_events_session_idx on capture_events(session_id);
  `);
}
