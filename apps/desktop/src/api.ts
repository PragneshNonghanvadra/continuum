import type { ApiHealth, CaptureArtifact, CaptureMode, CaptureSession, CaptureStatus } from "@continuum/core";

const API_BASE_URL = "http://127.0.0.1:5174/api";

export type AppSnapshot = {
  health?: ApiHealth;
  sessions: CaptureSession[];
  error?: string;
};

export async function fetchAppSnapshot(): Promise<AppSnapshot> {
  try {
    const [healthResponse, sessionsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/health`),
      fetch(`${API_BASE_URL}/sessions`)
    ]);

    if (!healthResponse.ok || !sessionsResponse.ok) {
      return { error: "Continuum local API is not ready.", sessions: [] };
    }

    const health = (await healthResponse.json()) as ApiHealth;
    const sessionsPayload = (await sessionsResponse.json()) as { sessions: CaptureSession[] };

    return {
      health,
      sessions: sessionsPayload.sessions
    };
  } catch {
    return { error: "Continuum local API is not reachable.", sessions: [] };
  }
}

export async function createSessionRequest(input: {
  mode: CaptureMode;
  sourceTitle?: string;
  sourceUrl?: string;
  title: string;
}) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error("Unable to create capture session");
  }
  return ((await response.json()) as { session: CaptureSession }).session;
}

export async function updateSessionRequest(id: string, input: { endedAt?: string; status?: CaptureStatus; title?: string }) {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!response.ok) {
    throw new Error("Unable to update capture session");
  }
  return ((await response.json()) as { session: CaptureSession }).session;
}

export async function fetchSessionArtifacts(id: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}/artifacts`);
  if (!response.ok) {
    return [] satisfies CaptureArtifact[];
  }
  return ((await response.json()) as { artifacts: CaptureArtifact[] }).artifacts;
}

export async function markImportantRequest(id: string, note: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}/important-moments`, {
    body: JSON.stringify({ note }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error("Unable to mark important moment");
  }
}
