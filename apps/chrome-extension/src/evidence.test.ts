import { expect, test } from "bun:test";
import { normalizeBrowserEvidence } from "./evidence";

test("normalizes browser text and video evidence into artifact payloads", () => {
  const artifacts = normalizeBrowserEvidence({
    keyframeDataUrl: "data:image/png;base64,abc",
    selectionText: "selected sentence",
    title: "Example video",
    url: "https://example.com/watch",
    videos: [
      {
        captionText: "caption line",
        currentTime: 10,
        duration: 100,
        paused: false,
        src: "https://cdn.example.com/video.mp4"
      }
    ],
    visibleText: "visible text"
  });

  expect(artifacts.map((artifact) => artifact.artifactType)).toEqual([
    "url_metadata",
    "browser_visible_text",
    "browser_selection",
    "video_metadata",
    "video_caption",
    "keyframe"
  ]);
  expect(artifacts[3]?.timestampStart).toBe(10);
});
