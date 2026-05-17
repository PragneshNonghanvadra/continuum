import { canCaptureFromTab } from "./capturePolicy";
import { fetchActiveSession, getPairingToken, sendExtensionArtifacts } from "./localApi";
import type { BrowserArtifactPayload } from "./evidence";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ continuumApiBaseUrl: "http://127.0.0.1:5174/api" });
  getPairingToken();
});

chrome.runtime.onMessage.addListener(
  (message: { artifacts?: BrowserArtifactPayload[]; type?: string }, sender: { tab?: { id?: number } }, sendResponse: (response: unknown) => void) => {
    if (message.type === "continuum:get-active-session") {
      fetchActiveSessionForSender(sender).then(sendResponse);
      return true;
    }

    if (message.type === "continuum:ingest-artifacts") {
      sendArtifactsForSender(sender, message.artifacts ?? []).then(sendResponse);
      return true;
    }

    return false;
  }
);

async function fetchActiveSessionForSender(sender: { tab?: { id?: number } }) {
  const response = await fetchActiveSession();
  const activeTabId = await getActiveTabId();
  return {
    ...response,
    active: canCaptureFromTab(response.session, sender.tab?.id, activeTabId)
  };
}

async function sendArtifactsForSender(sender: { tab?: { id?: number } }, artifacts: BrowserArtifactPayload[]) {
  const response = await fetchActiveSession();
  const activeTabId = await getActiveTabId();
  if (!canCaptureFromTab(response.session, sender.tab?.id, activeTabId)) {
    return { accepted: 0, skipped: "inactive_tab" };
  }
  return sendExtensionArtifacts(artifacts);
}

function getActiveTabId(): Promise<number | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: Array<{ id?: number }>) => resolve(tabs[0]?.id));
  });
}
