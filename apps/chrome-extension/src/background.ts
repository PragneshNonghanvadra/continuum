import { fetchActiveSession, getPairingToken, sendExtensionArtifacts } from "./localApi";
import type { BrowserArtifactPayload } from "./evidence";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ continuumApiBaseUrl: "http://127.0.0.1:5174/api" });
  getPairingToken();
});

chrome.runtime.onMessage.addListener(
  (message: { artifacts?: BrowserArtifactPayload[]; type?: string }, _sender: unknown, sendResponse: (response: unknown) => void) => {
    if (message.type === "continuum:get-active-session") {
      fetchActiveSession().then(sendResponse);
      return true;
    }

    if (message.type === "continuum:ingest-artifacts") {
      sendExtensionArtifacts(message.artifacts ?? []).then(sendResponse);
      return true;
    }

    return false;
  }
);
