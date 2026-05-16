import { normalizeBrowserEvidence } from "./evidence";

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

    if (response?.active) {
      const artifacts = normalizeBrowserEvidence({
        keyframeDataUrl: captureFirstVideoKeyframe(),
        selectionText: window.getSelection()?.toString(),
        title: document.title,
        url: location.href,
        videos: readVideoEvidence(),
        visibleText: readVisiblePageText().slice(0, 12000)
      });
      chrome.runtime.sendMessage({ artifacts, type: "continuum:ingest-artifacts" });
    }
  });
}

function readVideoEvidence() {
  return Array.from(document.querySelectorAll("video")).map((video) => ({
    captionText: readCaptionText(video),
    currentTime: video.currentTime,
    duration: Number.isFinite(video.duration) ? video.duration : undefined,
    paused: video.paused,
    src: video.currentSrc || video.src || undefined
  }));
}

function readCaptionText(video: HTMLVideoElement) {
  const activeTracks = Array.from(video.textTracks ?? []).filter((track) => track.mode === "showing");
  const cues = activeTracks.flatMap((track) => Array.from(track.activeCues ?? []));
  return cues
    .map((cue) => ("text" in cue ? String(cue.text) : ""))
    .filter(Boolean)
    .join("\n");
}

function captureFirstVideoKeyframe() {
  const video = document.querySelector("video");
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
    return undefined;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(video.videoWidth, 1280);
    canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}

if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
  syncCaptureState();
  window.setInterval(syncCaptureState, 5000);
}
