import type { ApiHealth, CaptureSession } from "@continuum/core";

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
