import { expect, test } from "bun:test";
import { createMemoryDatabase } from "./connection";
import { createImportantMoment, listImportantMomentsForSession } from "./importantMomentRepository";
import { createSession } from "./sessionRepository";

test("stores important moments on an intentional capture session", () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "article", title: "Readable session" });

  const moment = createImportantMoment(db, {
    note: "This explains why browser capture matters",
    sessionId: session.id,
    sourceUrl: "https://example.com",
    timestampSeconds: 42
  });

  const moments = listImportantMomentsForSession(db, session.id);
  expect(moments).toHaveLength(1);
  expect(moments[0]).toEqual(moment);
});
