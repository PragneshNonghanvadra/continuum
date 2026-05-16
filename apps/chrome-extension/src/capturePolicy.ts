export type ExtensionSessionSnapshot = {
  id: string;
  status: string;
};

export function canCaptureFromActiveSession(session: ExtensionSessionSnapshot | null | undefined) {
  return session?.status === "active";
}

export function extensionHeaders(pairingToken: string) {
  return {
    "content-type": "application/json",
    "x-continuum-pairing-token": pairingToken
  };
}
