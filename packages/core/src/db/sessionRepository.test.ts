import { expect, test } from "bun:test";
import { createMemoryDatabase } from "./connection";
import { createSession, deleteSession, getSession, listSessions, updateSession } from "./sessionRepository";

test("creates and lists non-deleted capture sessions", () => {
  const db = createMemoryDatabase();

  const session = createSession(db, {
    mode: "article",
    sourceTitle: "A good article",
    sourceUrl: "https://example.com/article",
    title: "Reading capture"
  });

  expect(session.status).toBe("active");
  expect(session.sourceUrl).toBe("https://example.com/article");
  expect(listSessions(db).map((item) => item.id)).toEqual([session.id]);
});

test("patches and soft-deletes capture sessions", () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "video", title: "Video capture" });

  const paused = updateSession(db, session.id, { status: "paused", title: "Paused video capture" });
  expect(paused?.status).toBe("paused");
  expect(paused?.title).toBe("Paused video capture");

  const deleted = deleteSession(db, session.id);
  expect(deleted?.status).toBe("deleted");
  expect(listSessions(db)).toEqual([]);
  expect(getSession(db, session.id, { includeDeleted: true })?.status).toBe("deleted");
});
