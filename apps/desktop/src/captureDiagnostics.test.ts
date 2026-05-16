import { expect, test } from "bun:test";
import { captureStateLabel, formatArtifactPreview, summarizeArtifactTypes, type CaptureDiagnostics } from "./captureDiagnostics";

test("capture diagnostics labels waiting and active evidence states", () => {
  expect(captureStateLabel("waiting_for_artifacts")).toBe("Waiting for evidence");
  expect(captureStateLabel("capturing")).toBe("Evidence arriving");
  expect(captureStateLabel("ready_to_process")).toBe("Ready to process");
  expect(captureStateLabel("stopped_without_artifacts")).toBe("Stopped with no evidence");
});

test("capture diagnostics formats artifact type counts and previews", () => {
  const diagnostics: CaptureDiagnostics = {
    recentArtifacts: [
      {
        artifactType: "browser_visible_text",
        contentPreview: "A long article body about Continuum capture.",
        createdAt: "2026-05-17T00:00:00.000Z",
        id: "artifact_1",
        sourceUrl: "https://example.com/article"
      }
    ],
    summary: {
      artifactCount: 3,
      artifactTypes: {
        browser_visible_text: 2,
        url_metadata: 1
      },
      capturedTextCharacters: 42,
      lastArtifactAt: "2026-05-17T00:00:00.000Z",
      state: "capturing"
    }
  };

  expect(summarizeArtifactTypes(diagnostics)).toEqual(["browser visible text x2", "url metadata x1"]);
  expect(formatArtifactPreview(diagnostics.recentArtifacts[0]!)).toBe(
    "browser visible text · A long article body about Continuum capture."
  );
});
