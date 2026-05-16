import { canCaptureFromActiveSession, extensionHeaders, type ExtensionSessionSnapshot } from "./capturePolicy";
import type { BrowserArtifactPayload } from "./evidence";
import type { ContinuumExtensionStatus } from "./extensionStatus";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:5174/api";
const STATUS_STORAGE_KEY = "continuumExtensionStatus";

export type ActiveSessionResponse = {
  active: boolean;
  session?: ExtensionSessionSnapshot;
};

export async function getApiBaseUrl() {
  const stored = await chromeStorageGet<{ continuumApiBaseUrl?: string }>("continuumApiBaseUrl");
  return stored.continuumApiBaseUrl ?? DEFAULT_API_BASE_URL;
}

export async function getPairingToken() {
  const stored = await chromeStorageGet<{ continuumPairingToken?: string }>("continuumPairingToken");
  if (stored.continuumPairingToken) {
    return stored.continuumPairingToken;
  }

  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/extension/pair`, {
    body: JSON.stringify({ browserName: "Chrome" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const payload = (await response.json()) as { pairing: { pairingToken: string } };
  await chromeStorageSet({ continuumPairingToken: payload.pairing.pairingToken });
  return payload.pairing.pairingToken;
}

export async function fetchActiveSession(): Promise<ActiveSessionResponse> {
  try {
    const apiBaseUrl = await getApiBaseUrl();
    const pairingToken = await getPairingToken();
    const response = await fetch(`${apiBaseUrl}/extension/active-session`, {
      headers: extensionHeaders(pairingToken)
    });

    if (!response.ok) {
      await updateExtensionStatus({
        active: false,
        lastCheckedAt: new Date().toISOString(),
        lastError: `Active session check failed with ${response.status}`
      });
      return { active: false };
    }

    const payload = (await response.json()) as { session: ExtensionSessionSnapshot | null };
    const active = canCaptureFromActiveSession(payload.session);
    await updateExtensionStatus({
      active,
      activeSessionTitle: payload.session?.title,
      lastCheckedAt: new Date().toISOString(),
      lastError: active ? undefined : "No active capture session"
    });
    return {
      active,
      session: payload.session ?? undefined
    };
  } catch (error) {
    await updateExtensionStatus({
      active: false,
      lastCheckedAt: new Date().toISOString(),
      lastError: error instanceof Error ? error.message : "Unable to reach Continuum"
    });
    return { active: false };
  }
}

export async function sendExtensionArtifacts(artifacts: BrowserArtifactPayload[]) {
  if (artifacts.length === 0) {
    return { accepted: 0 };
  }

  const apiBaseUrl = await getApiBaseUrl();
  const pairingToken = await getPairingToken();
  const response = await fetch(`${apiBaseUrl}/extension/artifacts`, {
    body: JSON.stringify({ artifacts }),
    headers: extensionHeaders(pairingToken),
    method: "POST"
  });

  if (!response.ok) {
    await updateExtensionStatus({
      lastError: response.status === 404 ? "No active capture session" : `Artifact ingest failed with ${response.status}`
    });
    return { accepted: 0 };
  }

  const payload = (await response.json()) as { artifacts: unknown[] };
  await updateExtensionStatus({
    lastAcceptedArtifactCount: payload.artifacts.length,
    lastCaptureAt: new Date().toISOString(),
    lastError: undefined
  });
  return { accepted: payload.artifacts.length };
}

async function updateExtensionStatus(patch: Partial<ContinuumExtensionStatus>) {
  const stored = await chromeStorageGet<{ [STATUS_STORAGE_KEY]?: ContinuumExtensionStatus }>(STATUS_STORAGE_KEY);
  await chromeStorageSet({
    [STATUS_STORAGE_KEY]: compactObject({
      ...(stored[STATUS_STORAGE_KEY] ?? { active: false }),
      ...patch
    })
  });
}

function chromeStorageGet<T>(key: string): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (items: T) => resolve(items));
  });
}

function chromeStorageSet(values: Record<string, unknown>) {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
