import { statusLines, type ContinuumExtensionStatus } from "./extensionStatus";

const statusEl = document.getElementById("status");
const detailEl = document.getElementById("details");

async function renderStatus() {
  const stored = await chromeStorageGet<{ continuumExtensionStatus?: ContinuumExtensionStatus }>("continuumExtensionStatus");
  try {
    const response = await fetch("http://127.0.0.1:5174/api/health");
    renderLines(response.ok, stored.continuumExtensionStatus);
  } catch {
    renderLines(false, stored.continuumExtensionStatus);
  }
}

function renderLines(connected: boolean, status?: ContinuumExtensionStatus) {
  const [headline, ...details] = statusLines(connected, status);
  statusEl!.textContent = headline ?? "Continuum status unavailable.";
  detailEl!.replaceChildren(
    ...details.map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    })
  );
}

function chromeStorageGet<T>(key: string): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (items: T) => resolve(items));
  });
}

renderStatus();
