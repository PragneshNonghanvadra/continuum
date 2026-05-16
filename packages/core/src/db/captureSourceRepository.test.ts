import { expect, test } from "bun:test";
import { createMemoryDatabase } from "./connection";
import { createSession } from "./sessionRepository";
import { createCaptureSource, ingestNativeCaptureEvent, listCaptureSourcesForSession } from "./captureSourceRepository";
import { listArtifactsForSession } from "./artifactRepository";

test("stores native capture sources for a session", () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "research", title: "Preview reading" });

  const source = createCaptureSource(db, {
    appName: "Preview",
    captureCapabilities: ["ocr_text", "document_text"],
    filePath: "/Users/me/Downloads/paper.pdf",
    permissionState: "granted",
    sessionId: session.id,
    sourceType: "file_document",
    windowTitle: "paper.pdf"
  });

  expect(source.sourceType).toBe("file_document");
  expect(source.captureCapabilities).toContain("document_text");
  expect(listCaptureSourcesForSession(db, session.id)[0]?.appName).toBe("Preview");
});

test("ingests native app capture events into the active session", () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "audio", title: "Podcast in Music" });

  const result = ingestNativeCaptureEvent(db, {
    artifacts: [
      {
        artifactType: "system_audio_metadata",
        metadata: { currentTime: 120, trackTitle: "Local podcast episode" },
        timestampStart: 120
      },
      {
        artifactType: "transcript",
        content: "The speaker explains hydration cost and React rendering.",
        timestampStart: 120,
        timestampEnd: 160
      }
    ],
    source: {
      appName: "Music",
      bundleId: "com.apple.Music",
      captureCapabilities: ["system_audio_metadata", "transcript"],
      permissionState: "granted",
      sessionId: session.id,
      sourceType: "system_audio",
      windowTitle: "Local podcast episode"
    }
  });

  expect(result.session.id).toBe(session.id);
  expect(result.source?.sourceType).toBe("system_audio");
  expect(result.artifacts).toHaveLength(2);
  expect(listArtifactsForSession(db, session.id).map((artifact) => artifact.artifactType)).toEqual([
    "system_audio_metadata",
    "transcript"
  ]);
});
