import type { Database } from "bun:sqlite";
import type { CaptureArtifact } from "../domain";
import { createArtifact } from "../db/artifactRepository";

export type TranscriptionInput = {
  mediaType: "audio" | "video";
  sourceLabel: string;
  filePath?: string;
};

export type TranscriptionResult = {
  text: string;
  provider: string;
  confidence: number;
  language?: string;
};

export interface TranscriptionProvider {
  readonly id: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export class MockTranscriptionProvider implements TranscriptionProvider {
  readonly id = "mock-local";

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    return {
      confidence: 0.6,
      language: "en",
      provider: this.id,
      text: `Mock transcript for ${input.sourceLabel}. This local placeholder proves the audio and video transcription pipeline without sending media outside Continuum.`
    };
  }
}

export class DisabledCloudTranscriptionProvider implements TranscriptionProvider {
  readonly id = "cloud-disabled";

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new Error("Cloud transcription is disabled until a provider is configured in Settings.");
  }
}

export function storeTranscriptArtifact(
  db: Database,
  input: {
    result: TranscriptionResult;
    sessionId: string;
  }
): CaptureArtifact {
  return createArtifact(db, {
    artifactType: "transcript",
    content: input.result.text,
    metadata: {
      confidence: input.result.confidence,
      language: input.result.language,
      provider: input.result.provider
    },
    sessionId: input.sessionId
  });
}
