export function readVisiblePageText(documentRef: Document = document): string {
  return documentRef.body?.innerText?.trim() ?? "";
}

function syncCaptureState() {
  chrome.runtime.sendMessage({ type: "continuum:get-active-session" }, (response?: { active?: boolean; session?: { id: string } }) => {
    document.documentElement.dataset.continuumCapture = response?.active ? "active" : "inactive";
    if (response?.session?.id) {
      document.documentElement.dataset.continuumSessionId = response.session.id;
    } else {
      delete document.documentElement.dataset.continuumSessionId;
    }
  });
}

if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
  syncCaptureState();
  window.setInterval(syncCaptureState, 5000);
}
