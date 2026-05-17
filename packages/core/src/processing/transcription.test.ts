import { expect, test } from "bun:test";
import { createMemoryDatabase } from "../db/connection";
import { createSession } from "../db/sessionRepository";
import {
  DisabledCloudTranscriptionProvider,
  HttpTranscriptionProvider,
  LocalCommandTranscriptionProvider,
  MockTranscriptionProvider,
  createTranscriptionProviderFromEnv,
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

test("local command transcription provider parses JSON command output", async () => {
  const provider = new LocalCommandTranscriptionProvider({
    command: "whisper",
    runner: async () => ({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({ confidence: 0.91, language: "en", text: "Local command transcript" })
    })
  });

  const result = await provider.transcribe({
    filePath: "/tmp/audio.wav",
    mediaType: "audio",
    sourceLabel: "Local audio"
  });

  expect(result.text).toBe("Local command transcript");
  expect(result.provider).toBe("local-command");
  expect(result.confidence).toBe(0.91);
});

test("HTTP transcription provider posts media metadata to configured endpoint", async () => {
  const requests: Request[] = [];
  const provider = new HttpTranscriptionProvider({
    fetcher: async (input, init) => {
      requests.push(new Request(input, init));
      return Response.json({ output: { confidence: 0.88, language: "en", text: "HTTP transcript" } });
    },
    url: "http://127.0.0.1:8080/transcribe"
  });

  const result = await provider.transcribe({
    filePath: "/tmp/video.mp4",
    mediaType: "video",
    sourceLabel: "Native video"
  });

  expect(result.text).toBe("HTTP transcript");
  expect(result.provider).toBe("http");
  expect(await requests[0]?.json()).toMatchObject({ filePath: "/tmp/video.mp4", mediaType: "video" });
});

test("transcription provider factory supports strict local command configuration", () => {
  const provider = createTranscriptionProviderFromEnv({
    CONTINUUM_TRANSCRIPTION_COMMAND: "whisper",
    CONTINUUM_TRANSCRIPTION_PROVIDER: "local_command"
  });

  expect(provider.id).toBe("local-command");
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
