import type { Database } from "bun:sqlite";

export function upsertTopic(db: Database, name: string, category?: string) {
  const slug = slugify(name);
  const now = new Date().toISOString();
  db.prepare(`
    insert into topics (id, name, slug, description, category, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?)
    on conflict(slug) do update set updated_at = excluded.updated_at
  `).run(crypto.randomUUID(), name, slug, `Auto-created from captured memories about ${name}.`, category ?? null, now, now);
  return db.query<{ id: string; slug: string }, [string]>("select id, slug from topics where slug = ?").get(slug)!;
}

export function attachMemoryToTopic(db: Database, topicId: string, memoryId: string) {
  db.prepare("insert or ignore into topic_memories (topic_id, memory_id, created_at) values (?, ?, ?)").run(
    topicId,
    memoryId,
    new Date().toISOString()
  );
}

export function upsertTag(db: Database, name: string) {
  const slug = slugify(name);
  const now = new Date().toISOString();
  db.prepare("insert into tags (id, name, slug, created_at) values (?, ?, ?, ?) on conflict(slug) do nothing").run(
    crypto.randomUUID(),
    name,
    slug,
    now
  );
  return db.query<{ id: string; slug: string }, [string]>("select id, slug from tags where slug = ?").get(slug)!;
}

export function attachMemoryToTag(db: Database, tagId: string, memoryId: string) {
  db.prepare("insert or ignore into memory_tags (memory_id, tag_id, created_at) values (?, ?, ?)").run(
    memoryId,
    tagId,
    new Date().toISOString()
  );
}

export function upsertEntity(db: Database, name: string, entityType = "concept") {
  const now = new Date().toISOString();
  db.prepare(`
    insert into entities (id, name, entity_type, created_at)
    values (?, ?, ?, ?)
    on conflict(name, entity_type) do nothing
  `).run(crypto.randomUUID(), name, entityType, now);
  return db.query<{ id: string }, [string, string]>("select id from entities where name = ? and entity_type = ?").get(name, entityType)!;
}

export function attachMemoryToEntity(db: Database, entityId: string, memoryId: string) {
  db.prepare("insert or ignore into memory_entities (memory_id, entity_id, created_at) values (?, ?, ?)").run(
    memoryId,
    entityId,
    new Date().toISOString()
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
