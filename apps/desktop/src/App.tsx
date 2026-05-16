import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CONTINUUM_PRODUCT_NAME, captureModes, type CaptureMode, type CaptureSession } from "@continuum/core";
import {
  createSessionRequest,
  fetchAppSnapshot,
  fetchSessionArtifacts,
  markImportantRequest,
  updateSessionRequest,
  type AppSnapshot
} from "./api";
import { navigationItems, type NavigationItem } from "./navigation";

const emptySnapshot: AppSnapshot = { sessions: [] };

export function App() {
  const [activeView, setActiveView] = useState<NavigationItem["id"]>("home");
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);

  const refreshSnapshot = async () => setSnapshot(await fetchAppSnapshot());

  useEffect(() => {
    refreshSnapshot();
  }, []);

  const activeLabel = useMemo(
    () => navigationItems.find((item) => item.id === activeView)?.label ?? "Home",
    [activeView]
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">{CONTINUUM_PRODUCT_NAME}</div>
          <div className={snapshot.health?.ok ? "status-pill status-pill--online" : "status-pill"}>
            {snapshot.health?.ok ? "Local API online" : "Local API offline"}
          </div>
        </div>
        <nav>
          {navigationItems.map((item) => (
            <button
              aria-pressed={activeView === item.id}
              className="nav-item"
              key={item.id}
              onClick={() => setActiveView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="page-header">
          <p>Desktop capture memory system</p>
          <h1>{activeLabel}</h1>
        </header>
        {snapshot.error ? <div className="notice">{snapshot.error}</div> : null}
        <View refresh={refreshSnapshot} view={activeView} sessions={snapshot.sessions} />
      </section>
    </main>
  );
}

function View({
  refresh,
  sessions,
  view
}: {
  refresh: () => Promise<void>;
  sessions: CaptureSession[];
  view: NavigationItem["id"];
}) {
  if (view === "home") {
    return <Home sessions={sessions} />;
  }

  if (view === "capture") {
    return <CaptureView refresh={refresh} sessions={sessions} />;
  }

  if (view === "settings") {
    return (
      <Panel title="Settings">
        <dl className="settings-list">
          <div>
            <dt>Data directory</dt>
            <dd>Local SQLite and artifact storage, configurable through the API environment.</dd>
          </div>
          <div>
            <dt>Extension pairing</dt>
            <dd>Chrome extension pairing is local-only and session-scoped.</dd>
          </div>
          <div>
            <dt>Privacy</dt>
            <dd>Raw audio/video retention is off by default; derived artifacts are kept locally.</dd>
          </div>
        </dl>
      </Panel>
    );
  }

  return (
    <Panel title={navigationItems.find((item) => item.id === view)?.label ?? "Continuum"}>
      <p>This section is in the desktop shell and will fill in as the capture loop lands.</p>
    </Panel>
  );
}

function CaptureView({ refresh, sessions }: { refresh: () => Promise<void>; sessions: CaptureSession[] }) {
  const activeSession = sessions.find((session) => session.status === "active" || session.status === "paused");
  const [artifactCount, setArtifactCount] = useState(0);
  const [form, setForm] = useState({
    mode: "article" as CaptureMode,
    sourceTitle: "",
    sourceUrl: "",
    title: ""
  });
  const [importantNote, setImportantNote] = useState("");
  const [actionError, setActionError] = useState<string | undefined>();

  useEffect(() => {
    if (!activeSession) {
      setArtifactCount(0);
      return;
    }
    fetchSessionArtifacts(activeSession.id).then((artifacts) => setArtifactCount(artifacts.length));
  }, [activeSession?.id]);

  async function runAction(action: () => Promise<void>) {
    setActionError(undefined);
    try {
      await action();
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Capture action failed");
    }
  }

  if (activeSession) {
    const paused = activeSession.status === "paused";

    return (
      <div className="capture-layout">
        <Panel title="Active Capture">
          <div className="active-capture">
            <div>
              <strong>{activeSession.title}</strong>
              <span>
                {activeSession.mode.replace("_", " ")} · {activeSession.status}
              </span>
            </div>
            {activeSession.sourceUrl ? <a href={activeSession.sourceUrl}>{activeSession.sourceUrl}</a> : null}
            <div className="capture-stats">
              <span>{artifactCount} artifacts captured</span>
              <span>Started {new Date(activeSession.startedAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="button-row">
            <button
              className="primary-button"
              onClick={() => runAction(() => updateSessionRequest(activeSession.id, { status: paused ? "active" : "paused" }).then())}
              type="button"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                runAction(() =>
                  updateSessionRequest(activeSession.id, { endedAt: new Date().toISOString(), status: "processing" }).then()
                )
              }
              type="button"
            >
              Stop Capture
            </button>
          </div>
        </Panel>
        <Panel title="Mark Moment">
          <div className="form-stack">
            <textarea
              onChange={(event) => setImportantNote(event.target.value)}
              placeholder="Why this moment matters"
              rows={4}
              value={importantNote}
            />
            <button
              className="secondary-button"
              disabled={importantNote.trim().length === 0}
              onClick={() =>
                runAction(async () => {
                  await markImportantRequest(activeSession.id, importantNote.trim());
                  setImportantNote("");
                })
              }
              type="button"
            >
              Mark Important
            </button>
          </div>
        </Panel>
        {actionError ? <div className="notice">{actionError}</div> : null}
      </div>
    );
  }

  return (
    <div className="capture-layout">
      <Panel title="Start Capture">
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            runAction(async () => {
              await createSessionRequest({
                mode: form.mode,
                sourceTitle: form.sourceTitle.trim() || undefined,
                sourceUrl: form.sourceUrl.trim() || undefined,
                title: form.title.trim()
              });
              setForm({ mode: "article", sourceTitle: "", sourceUrl: "", title: "" });
            });
          }}
        >
          <label>
            Title
            <input
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="What are you exploring?"
              required
              value={form.title}
            />
          </label>
          <label>
            Mode
            <select
              onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value as CaptureMode }))}
              value={form.mode}
            >
              {captureModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source URL
            <input
              onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))}
              placeholder="Optional"
              value={form.sourceUrl}
            />
          </label>
          <label>
            Source title
            <input
              onChange={(event) => setForm((current) => ({ ...current, sourceTitle: event.target.value }))}
              placeholder="Optional"
              value={form.sourceTitle}
            />
          </label>
          <button className="primary-button" type="submit">
            Start Capture
          </button>
        </form>
      </Panel>
      <Panel title="How Capture Works">
        <p>Start a session, keep browsing normally, and the paired extension sends browser evidence to the local app only while capture is active.</p>
      </Panel>
      {actionError ? <div className="notice">{actionError}</div> : null}
    </div>
  );
}

function Home({ sessions }: { sessions: CaptureSession[] }) {
  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="dashboard-grid">
      <Panel title="Recent Sessions">
        {recentSessions.length > 0 ? (
          <ul className="session-list">
            {recentSessions.map((session) => (
              <li key={session.id}>
                <strong>{session.title}</strong>
                <span>
                  {session.mode.replace("_", " ")} · {session.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No sessions yet. Start capture from the Capture section.</p>
        )}
      </Panel>
      <Panel title="Suggested Memories">
        <p>Suggested cards will appear here after session processing.</p>
      </Panel>
      <Panel title="Active Topics">
        <p>Topics are generated from approved memory cards.</p>
      </Panel>
      <Panel title="Upcoming Revision">
        <p>Learning and interview sessions generate revision prompts after processing.</p>
      </Panel>
    </div>
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
