import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const captureSessions = sqliteTable("capture_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  sourceApp: text("source_app"),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const captureArtifacts = sqliteTable("capture_artifacts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  artifactType: text("artifact_type").notNull(),
  content: text("content"),
  filePath: text("file_path"),
  timestampStart: real("timestamp_start"),
  timestampEnd: real("timestamp_end"),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at").notNull()
});

export const memoryCards = sqliteTable("memory_cards", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  fullText: text("full_text").notNull(),
  category: text("category").notNull(),
  memoryType: text("memory_type").notNull(),
  importance: integer("importance").notNull(),
  confidence: real("confidence").notNull(),
  status: text("status").notNull(),
  evidenceJson: text("evidence_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const memoryLinks = sqliteTable("memory_links", {
  id: text("id").primaryKey(),
  sourceMemoryId: text("source_memory_id").notNull(),
  targetMemoryId: text("target_memory_id").notNull(),
  relationType: text("relation_type").notNull(),
  score: real("score").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("suggested"),
  createdAt: text("created_at").notNull()
});

export const readerPages = sqliteTable(
  "reader_pages",
  {
    id: text("id").primaryKey(),
    pageType: text("page_type").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    sourceSessionId: text("source_session_id"),
    topicKey: text("topic_key"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    slugIdx: uniqueIndex("reader_pages_slug_idx").on(table.slug)
  })
);

export const topics = sqliteTable(
  "topics",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    category: text("category"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    slugIdx: uniqueIndex("topics_slug_idx").on(table.slug)
  })
);

export const topicMemories = sqliteTable("topic_memories", {
  topicId: text("topic_id").notNull(),
  memoryId: text("memory_id").notNull(),
  createdAt: text("created_at").notNull()
});

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    slugIdx: uniqueIndex("tags_slug_idx").on(table.slug)
  })
);

export const memoryTags = sqliteTable("memory_tags", {
  memoryId: text("memory_id").notNull(),
  tagId: text("tag_id").notNull(),
  createdAt: text("created_at").notNull()
});

export const entities = sqliteTable(
  "entities",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    entityType: text("entity_type").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    nameTypeIdx: uniqueIndex("entities_name_type_idx").on(table.name, table.entityType)
  })
);

export const memoryEntities = sqliteTable("memory_entities", {
  memoryId: text("memory_id").notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: text("created_at").notNull()
});

export const revisionItems = sqliteTable("revision_items", {
  id: text("id").primaryKey(),
  memoryId: text("memory_id"),
  readerPageId: text("reader_page_id"),
  question: text("question").notNull(),
  answer: text("answer"),
  difficulty: text("difficulty").notNull(),
  status: text("status").notNull(),
  dueAt: text("due_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const extensionPairings = sqliteTable("extension_pairings", {
  id: text("id").primaryKey(),
  pairingToken: text("pairing_token").notNull(),
  browserName: text("browser_name").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const captureEvents = sqliteTable("capture_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  metadataJson: text("metadata_json"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull()
});

export const mediaChunks = sqliteTable("media_chunks", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  sourceUrl: text("source_url"),
  mediaType: text("media_type").notNull(),
  filePath: text("file_path"),
  transcriptArtifactId: text("transcript_artifact_id"),
  retained: integer("retained", { mode: "boolean" }).notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  createdAt: text("created_at").notNull()
});

export const keyframes = sqliteTable("keyframes", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  sourceUrl: text("source_url"),
  filePath: text("file_path").notNull(),
  ocrText: text("ocr_text"),
  timestampSeconds: real("timestamp_seconds"),
  createdAt: text("created_at").notNull()
});

export const importantMoments = sqliteTable("important_moments", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  note: text("note"),
  sourceUrl: text("source_url"),
  timestampSeconds: real("timestamp_seconds"),
  createdAt: text("created_at").notNull()
});
