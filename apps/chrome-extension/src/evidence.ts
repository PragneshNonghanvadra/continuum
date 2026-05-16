import type { ArtifactType } from "@continuum/core";

export type BrowserVideoEvidence = {
  captionText?: string;
  currentTime?: number;
  duration?: number;
  paused?: boolean;
  src?: string;
};

export type BrowserEvidenceInput = {
  keyframeDataUrl?: string;
  selectionText?: string;
  title: string;
  url: string;
  videos?: BrowserVideoEvidence[];
  visibleText?: string;
};

export type BrowserArtifactPayload = {
  artifactType: ArtifactType;
  content?: string;
  metadata?: Record<string, unknown>;
  timestampEnd?: number;
  timestampStart?: number;
};

export function normalizeBrowserEvidence(input: BrowserEvidenceInput): BrowserArtifactPayload[] {
  const artifacts: BrowserArtifactPayload[] = [
    {
      artifactType: "url_metadata",
      metadata: {
        title: input.title,
        url: input.url
      }
    }
  ];

  if (input.visibleText?.trim()) {
    artifacts.push({
      artifactType: "browser_visible_text",
      content: input.visibleText.trim(),
      metadata: { title: input.title, url: input.url }
    });
  }

  if (input.selectionText?.trim()) {
    artifacts.push({
      artifactType: "browser_selection",
      content: input.selectionText.trim(),
      metadata: { title: input.title, url: input.url }
    });
  }

  for (const video of input.videos ?? []) {
    artifacts.push({
      artifactType: "video_metadata",
      metadata: {
        duration: video.duration,
        paused: video.paused,
        src: video.src,
        title: input.title,
        url: input.url
      },
      timestampStart: video.currentTime
    });

    if (video.captionText?.trim()) {
      artifacts.push({
        artifactType: "video_caption",
        content: video.captionText.trim(),
        metadata: { title: input.title, url: input.url },
        timestampStart: video.currentTime
      });
    }
  }

  if (input.keyframeDataUrl) {
    artifacts.push({
      artifactType: "keyframe",
      content: input.keyframeDataUrl,
      metadata: {
        title: input.title,
        url: input.url
      }
    });
  }

  return artifacts;
}
