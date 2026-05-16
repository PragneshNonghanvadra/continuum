import type {
  ApiHealth,
  AiProviderDescription,
  CaptureArtifact,
  CaptureMode,
  CaptureSession,
  CaptureStatus,
  MemoryCard,
  MemoryLink,
  ReaderPage,
  SearchResult,
  AskMemoryAnswer,
  RevisionItem
} from "@continuum/core/browser";

const API_BASE_URL = "http://127.0.0.1:5174/api";

export type AppSnapshot = {
  health?: ApiHealth;
  links: MemoryLink[];
  memories: MemoryCard[];
  readerPages: ReaderPage[];
  revisionItems: RevisionItem[];
  sessions: CaptureSession[];
  aiProvider?: AiProviderDescription;
  captureCapabilities: CaptureCapability[];
  error?: string;
};

export type CaptureCapability = {
  artifactTypes: string[];
  permissionNotes: string;
  sourceType: string;
};

export async function fetchAppSnapshot(): Promise<AppSnapshot> {
  try {
    const [
      healthResponse,
      sessionsResponse,
      memoriesResponse,
      linksResponse,
      readerPagesResponse,
      revisionResponse,
      aiSettingsResponse,
      captureCapabilitiesResponse
    ] = await Promise.all([
      fetch(`${API_BASE_URL}/health`),
      fetch(`${API_BASE_URL}/sessions`),
      fetch(`${API_BASE_URL}/memories`),
      fetch(`${API_BASE_URL}/memory-links`),
      fetch(`${API_BASE_URL}/reader-pages`),
      fetch(`${API_BASE_URL}/revision-items`),
      fetch(`${API_BASE_URL}/settings/ai`),
      fetch(`${API_BASE_URL}/capture/capabilities`)
    ]);

    if (
      !healthResponse.ok ||
      !sessionsResponse.ok ||
      !memoriesResponse.ok ||
      !linksResponse.ok ||
      !readerPagesResponse.ok ||
      !revisionResponse.ok ||
      !aiSettingsResponse.ok ||
      !captureCapabilitiesResponse.ok
    ) {
      return {
        captureCapabilities: [],
        error: "Continuum local API is not ready.",
        links: [],
        memories: [],
        readerPages: [],
        revisionItems: [],
        sessions: []
      };
    }

    const health = (await healthResponse.json()) as ApiHealth;
    const sessionsPayload = (await sessionsResponse.json()) as { sessions: CaptureSession[] };
    const memoriesPayload = (await memoriesResponse.json()) as { memories: MemoryCard[] };
    const linksPayload = (await linksResponse.json()) as { links: MemoryLink[] };
    const readerPagesPayload = (await readerPagesResponse.json()) as { readerPages: ReaderPage[] };
    const revisionPayload = (await revisionResponse.json()) as { revisionItems: RevisionItem[] };
    const aiSettingsPayload = (await aiSettingsResponse.json()) as { provider: AiProviderDescription };
    const captureCapabilitiesPayload = (await captureCapabilitiesResponse.json()) as { capabilities: CaptureCapability[] };

    return {
      aiProvider: aiSettingsPayload.provider,
      captureCapabilities: captureCapabilitiesPayload.capabilities,
      health,
      links: linksPayload.links,
      memories: memoriesPayload.memories,
      readerPages: readerPagesPayload.readerPages,
      revisionItems: revisionPayload.revisionItems,
      sessions: sessionsPayload.sessions
    };
  } catch {
    return {
      captureCapabilities: [],
      error: "Continuum local API is not reachable.",
      links: [],
      memories: [],
      readerPages: [],
      revisionItems: [],
      sessions: []
    };
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

export async function processSessionRequest(id: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}/process`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Unable to process capture session");
  }
  return (await response.json()) as { exportResult?: { exportDir: string; fileCount: number }; memoryCount: number; readerPageId: string };
}

export async function updateMemoryRequest(id: string, input: Partial<Pick<MemoryCard, "status" | "summary" | "title">>) {
  const response = await fetch(`${API_BASE_URL}/memories/${id}`, {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!response.ok) {
    throw new Error("Unable to update memory");
  }
  return ((await response.json()) as { memory: MemoryCard }).memory;
}

export async function approveMemoryRequest(id: string) {
  const response = await fetch(`${API_BASE_URL}/memories/${id}/approve`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Unable to approve memory");
  }
}

export async function rejectMemoryRequest(id: string) {
  const response = await fetch(`${API_BASE_URL}/memories/${id}/reject`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Unable to reject memory");
  }
}

export async function searchMemoryRequest(q: string) {
  const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(q)}`);
  if (!response.ok) {
    throw new Error("Unable to search memory");
  }
  return ((await response.json()) as { results: SearchResult[] }).results;
}

export async function askMemoryRequest(question: string): Promise<AskMemoryAnswer> {
  const response = await fetch(`${API_BASE_URL}/ask-memory`, {
    body: JSON.stringify({ question }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error("Unable to ask memory");
  }
  return (await response.json()) as AskMemoryAnswer;
}

export async function updateRevisionItemRequest(id: string, status: RevisionItem["status"]) {
  const response = await fetch(`${API_BASE_URL}/revision-items/${id}`, {
    body: JSON.stringify({ status }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!response.ok) {
    throw new Error("Unable to update revision item");
  }
}

export async function exportMarkdownRequest(exportDir?: string) {
  const response = await fetch(`${API_BASE_URL}/export/markdown`, {
    body: JSON.stringify({ exportDir: exportDir?.trim() || undefined }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error("Unable to export Markdown vault");
  }
  return (await response.json()) as { exportDir: string; fileCount: number; files: string[] };
}
