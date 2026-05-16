import { expect, test } from "bun:test";
import { createMemoryDatabase } from "./connection";
import { createArtifact, listArtifactsForSession } from "./artifactRepository";
import { createSession } from "./sessionRepository";

test("stores browser and media artifacts on a capture session", () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "video", title: "Video session" });

  const textArtifact = createArtifact(db, {
    artifactType: "browser_text",
    content: "Visible article text",
    metadata: { url: "https://example.com/read" },
    sessionId: session.id
  });
  const captionArtifact = createArtifact(db, {
    artifactType: "video_caption",
    content: "Caption text",
    sessionId: session.id,
    timestampEnd: 12,
    timestampStart: 4
  });

  const artifacts = listArtifactsForSession(db, session.id);
  expect(artifacts.map((artifact) => artifact.id)).toEqual([textArtifact.id, captionArtifact.id]);
  expect(artifacts[0]?.metadata).toEqual({ url: "https://example.com/read" });
  expect(artifacts[1]?.timestampStart).toBe(4);
});
