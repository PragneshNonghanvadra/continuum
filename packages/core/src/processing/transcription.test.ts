import { expect, test } from "bun:test";
import { createMemoryDatabase } from "../db/connection";
import { createSession } from "../db/sessionRepository";
import {
  DisabledCloudTranscriptionProvider,
  MockTranscriptionProvider,
  storeTranscriptArtifact
} from "./transcription";

test("mock transcription provider returns deterministic local transcript text", async () => {
  const provider = new MockTranscriptionProvider();

  const result = await provider.transcribe({
    mediaType: "audio",
    sourceLabel: "Frontend podcast"
  });

  expect(result.text).toContain("Frontend podcast");
  expect(result.provider).toBe("mock-local");
});

test("disabled cloud transcription provider refuses work until configured", async () => {
  const provider = new DisabledCloudTranscriptionProvider();

  await expect(provider.transcribe({ mediaType: "audio", sourceLabel: "Meeting" })).rejects.toThrow(
    "Cloud transcription is disabled"
  );
});

test("stores transcript output as a local capture artifact", async () => {
  const db = createMemoryDatabase();
  const session = createSession(db, { mode: "audio", title: "Podcast" });
  const provider = new MockTranscriptionProvider();
  const result = await provider.transcribe({ mediaType: "audio", sourceLabel: "Podcast" });

  const artifact = storeTranscriptArtifact(db, {
    result,
    sessionId: session.id
  });

  expect(artifact.artifactType).toBe("transcript");
  expect(artifact.content).toContain("Podcast");
  expect(artifact.metadata?.provider).toBe("mock-local");
});
