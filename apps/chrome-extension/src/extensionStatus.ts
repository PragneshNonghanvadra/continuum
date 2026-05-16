export type ContinuumExtensionStatus = {
  active: boolean;
  activeSessionTitle?: string;
  lastAcceptedArtifactCount?: number;
  lastCaptureAt?: string;
  lastCheckedAt?: string;
  lastError?: string;
};

export function statusLines(connected: boolean, status?: ContinuumExtensionStatus) {
  const lines = [connected ? "Connected to Continuum." : "Continuum is not reachable."];

  if (connected) {
    lines.push(status?.active ? `Active session: ${status.activeSessionTitle ?? "Untitled session"}` : "No active capture session detected.");
  }

  if (status?.lastAcceptedArtifactCount !== undefined && status.lastCaptureAt) {
    lines.push(`Last ingest accepted ${status.lastAcceptedArtifactCount} artifacts.`);
  }

  if (status?.lastError) {
    lines.push(`Last issue: ${status.lastError}`);
  }

  return lines;
}
