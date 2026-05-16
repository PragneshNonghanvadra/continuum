import { fetchActiveSession, getPairingToken } from "./localApi";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ continuumApiBaseUrl: "http://127.0.0.1:5174/api" });
  getPairingToken();
});

chrome.runtime.onMessage.addListener((message: { type?: string }, _sender: unknown, sendResponse: (response: unknown) => void) => {
  if (message.type !== "continuum:get-active-session") {
    return false;
  }

  fetchActiveSession().then(sendResponse);
  return true;
});
