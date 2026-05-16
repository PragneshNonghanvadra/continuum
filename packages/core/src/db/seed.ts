import type { Database } from "bun:sqlite";

const seedSessions = [
  {
    id: "seed_session_local_first_architecture",
    title: "Local-first personal memory architecture",
    mode: "article",
    sourceTitle: "Local-first personal memory architecture",
    content:
      "The system should use SQLite as the source of truth. Markdown export should be treated as a readable mirror. AI chat should query memory through retrieval rather than reading the whole database."
  },
  {
    id: "seed_session_capture_ux",
    title: "Capture UX discussion",
    mode: "ai_chat",
    sourceTitle: "Capture UX discussion",
    content:
      "The user does not want to manually add memories through CLI or web app. They prefer intentional capture sessions while reading articles, watching videos, listening to audio, or exploring with AI."
  },
  {
    id: "seed_session_frontend_performance",
    title: "Frontend performance revision",
    mode: "interview_prep",
    sourceTitle: "Frontend performance revision",
    content:
      "Core Web Vitals, LCP, CLS, INP, bundle splitting, lazy loading, hydration cost, React rendering, caching, and CDN strategy are important frontend interview topics."
  }
];

export function seedDevelopmentData(db: Database) {
  const now = "2026-05-16T00:00:00.000Z";
  const insertSession = db.prepare(`
    insert or ignore into capture_sessions (
      id, title, mode, status, source_app, source_url, source_title, started_at, ended_at, created_at, updated_at
    ) values (?, ?, ?, 'processed', 'seed', null, ?, ?, ?, ?, ?)
  `);
  const insertArtifact = db.prepare(`
    insert or ignore into capture_artifacts (
      id, session_id, artifact_type, content, file_path, timestamp_start, timestamp_end, metadata_json, created_at
    ) values (?, ?, ?, ?, null, null, null, ?, ?)
  `);

  for (const [index, session] of seedSessions.entries()) {
    const timestamp = `2026-05-16T0${index}:00:00.000Z`;
    insertSession.run(session.id, session.title, session.mode, session.sourceTitle, timestamp, timestamp, now, now);
    insertArtifact.run(
      `${session.id}_artifact`,
      session.id,
      session.mode === "ai_chat" ? "ai_chat" : session.mode === "interview_prep" ? "manual_note" : "article_text",
      session.content,
      JSON.stringify({ seeded: true }),
      now
    );
  }
}

export function ensureSeedData(db: Database) {
  const row = db.query<{ count: number }, []>("select count(*) as count from capture_sessions").get();
  if ((row?.count ?? 0) === 0) {
    seedDevelopmentData(db);
  }
}
