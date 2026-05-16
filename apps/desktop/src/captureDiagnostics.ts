export type CaptureDiagnosticsState =
  | "active"
  | "archived"
  | "capturing"
  | "deleted"
  | "paused"
  | "processed"
  | "ready_to_process"
  | "stopped_without_artifacts"
  | "waiting_for_artifacts";

export type CaptureDiagnostics = {
  recentArtifacts: Array<{
    artifactType: string;
    contentPreview?: string;
    createdAt: string;
    id: string;
    metadata?: Record<string, unknown>;
    sourceUrl?: string;
  }>;
  summary: {
    artifactCount: number;
    artifactTypes: Record<string, number>;
    capturedTextCharacters: number;
    lastArtifactAt?: string;
    state: CaptureDiagnosticsState;
  };
};

export function captureStateLabel(state: CaptureDiagnosticsState) {
  const labels: Record<CaptureDiagnosticsState, string> = {
    active: "Active",
    archived: "Archived",
    capturing: "Evidence arriving",
    deleted: "Deleted",
    paused: "Paused",
    processed: "Processed",
    ready_to_process: "Ready to process",
    stopped_without_artifacts: "Stopped with no evidence",
    waiting_for_artifacts: "Waiting for evidence"
  };
  return labels[state] ?? state.replaceAll("_", " ");
}

export function summarizeArtifactTypes(diagnostics?: CaptureDiagnostics) {
  if (!diagnostics) return [];
  return Object.entries(diagnostics.summary.artifactTypes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([artifactType, count]) => `${humanizeArtifactType(artifactType)} x${count}`);
}

export function formatArtifactPreview(artifact: CaptureDiagnostics["recentArtifacts"][number]) {
  return [humanizeArtifactType(artifact.artifactType), artifact.contentPreview || artifact.sourceUrl || "metadata captured"].join(" · ");
}

export function humanizeArtifactType(artifactType: string) {
  return artifactType.replaceAll("_", " ");
}
