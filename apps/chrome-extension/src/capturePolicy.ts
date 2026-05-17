export type ExtensionSessionSnapshot = {
  id: string;
  status: string;
  title?: string;
};

export function canCaptureFromActiveSession(session: ExtensionSessionSnapshot | null | undefined) {
  return session?.status === "active";
}

export function canCaptureFromTab(session: ExtensionSessionSnapshot | null | undefined, senderTabId: number | undefined, activeTabId: number | undefined) {
  return canCaptureFromActiveSession(session) && senderTabId !== undefined && senderTabId === activeTabId;
}

export function extensionHeaders(pairingToken: string) {
  return {
    "content-type": "application/json",
    "x-continuum-pairing-token": pairingToken
  };
}
