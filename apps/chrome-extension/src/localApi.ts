import { canCaptureFromActiveSession, extensionHeaders, type ExtensionSessionSnapshot } from "./capturePolicy";
import type { BrowserArtifactPayload } from "./evidence";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:5174/api";

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
      return { active: false };
    }

    const payload = (await response.json()) as { session: ExtensionSessionSnapshot | null };
    return {
      active: canCaptureFromActiveSession(payload.session),
      session: payload.session ?? undefined
    };
  } catch {
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
    return { accepted: 0 };
  }

  const payload = (await response.json()) as { artifacts: unknown[] };
  return { accepted: payload.artifacts.length };
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
