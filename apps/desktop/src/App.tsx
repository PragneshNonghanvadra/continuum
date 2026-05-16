import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CONTINUUM_PRODUCT_NAME, type CaptureSession } from "@continuum/core";
import { fetchAppSnapshot, type AppSnapshot } from "./api";
import { navigationItems, type NavigationItem } from "./navigation";

const emptySnapshot: AppSnapshot = { sessions: [] };

export function App() {
  const [activeView, setActiveView] = useState<NavigationItem["id"]>("home");
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);

  useEffect(() => {
    fetchAppSnapshot().then(setSnapshot);
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
        <View view={activeView} sessions={snapshot.sessions} />
      </section>
    </main>
  );
}

function View({ sessions, view }: { sessions: CaptureSession[]; view: NavigationItem["id"] }) {
  if (view === "home") {
    return <Home sessions={sessions} />;
  }

  if (view === "capture") {
    return (
      <Panel title="Capture">
        <p>Start a focused session, keep browsing normally, and let Continuum collect browser evidence through the paired extension.</p>
      </Panel>
    );
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
