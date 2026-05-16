const API_BASE_URL = "http://127.0.0.1:5174/api";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ continuumApiBaseUrl: API_BASE_URL });
});
