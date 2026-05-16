import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CONTINUUM_PRODUCT_NAME,
  captureModes,
  type CaptureMode,
  type CaptureSession,
  type MemoryCard,
  type MemoryLink,
  type ReaderPage,
  type SearchResult,
  type AskMemoryAnswer,
  type RevisionItem
} from "@continuum/core/browser";
import {
  askMemoryRequest,
  approveMemoryRequest,
  createSessionRequest,
  exportMarkdownRequest,
  fetchCaptureDiagnosticsRequest,
  fetchAppSnapshot,
  markImportantRequest,
  processSessionRequest,
  rejectMemoryRequest,
  searchMemoryRequest,
  updateRevisionItemRequest,
  updateMemoryRequest,
  updateSessionRequest,
  type AppSnapshot,
  type CaptureCapability
} from "./api";
import {
  captureStateLabel,
  formatArtifactPreview,
  summarizeArtifactTypes,
  type CaptureDiagnostics
} from "./captureDiagnostics";
import { navigationItems, type NavigationItem } from "./navigation";

const emptySnapshot: AppSnapshot = { captureCapabilities: [], links: [], memories: [], readerPages: [], revisionItems: [], sessions: [] };

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
  const activeSession = snapshot.sessions.find((session) => session.status === "active" || session.status === "paused");
  const processingCount = snapshot.sessions.filter((session) => session.status === "processing").length;
  const suggestedCount = snapshot.memories.filter((memory) => memory.status === "suggested").length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand">{CONTINUUM_PRODUCT_NAME}</div>
          <div className="brand-caption">AI-first memory cockpit</div>
          <div className={snapshot.health?.ok ? "status-pill status-pill--online" : "status-pill"}>
            {snapshot.health?.ok ? "API online" : "API offline"}
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
          <div>
            <p>Desktop capture memory system</p>
            <h1>{activeLabel}</h1>
          </div>
          <div className="header-status-grid">
            <StatusTile label="AI" value={snapshot.aiProvider?.configured ? snapshot.aiProvider.label : "Mock fallback"} />
            <StatusTile label="Capture" value={activeSession ? activeSession.status : `${processingCount} ready`} />
            <StatusTile label="Review" value={`${suggestedCount} suggested`} />
          </div>
        </header>
        {snapshot.error ? <div className="notice">{snapshot.error}</div> : null}
        <View
          aiLabel={snapshot.aiProvider?.configured ? snapshot.aiProvider.label : "Mock fallback"}
          captureCapabilities={snapshot.captureCapabilities}
          links={snapshot.links}
          memories={snapshot.memories}
          readerPages={snapshot.readerPages}
          revisionItems={snapshot.revisionItems}
          refresh={refreshSnapshot}
          view={activeView}
          sessions={snapshot.sessions}
        />
      </section>
      <CommandDock
        activeSession={activeSession}
        onNavigate={setActiveView}
        processingCount={processingCount}
        suggestedCount={suggestedCount}
      />
    </main>
  );
}

function View({
  aiLabel,
  captureCapabilities,
  refresh,
  links,
  memories,
  readerPages,
  revisionItems,
  sessions,
  view
}: {
  aiLabel: string;
  captureCapabilities: CaptureCapability[];
  links: MemoryLink[];
  memories: MemoryCard[];
  readerPages: ReaderPage[];
  revisionItems: RevisionItem[];
  refresh: () => Promise<void>;
  sessions: CaptureSession[];
  view: NavigationItem["id"];
}) {
  if (view === "home") {
    return <Home memories={memories} sessions={sessions} />;
  }

  if (view === "capture") {
    return <CaptureView captureCapabilities={captureCapabilities} refresh={refresh} sessions={sessions} />;
  }

  if (view === "inbox") {
    return <InboxView links={links} memories={memories} refresh={refresh} sessions={sessions} />;
  }

  if (view === "library") {
    return <LibraryView links={links} memories={memories} readerPages={readerPages} sessions={sessions} />;
  }

  if (view === "topics") {
    return <TopicsView memories={memories} readerPages={readerPages} sessions={sessions} />;
  }

  if (view === "search") {
    return <SearchView />;
  }

  if (view === "ask-memory") {
    return <AskMemoryView />;
  }

  if (view === "revision") {
    return <RevisionView refresh={refresh} revisionItems={revisionItems} />;
  }

  if (view === "settings") {
    return <SettingsView aiLabel={aiLabel} />;
  }

  return (
    <Panel title={navigationItems.find((item) => item.id === view)?.label ?? "Continuum"}>
      <p>This section is in the desktop shell and will fill in as the capture loop lands.</p>
    </Panel>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CommandDock({
  activeSession,
  onNavigate,
  processingCount,
  suggestedCount
}: {
  activeSession?: CaptureSession;
  onNavigate: (view: NavigationItem["id"]) => void;
  processingCount: number;
  suggestedCount: number;
}) {
  return (
    <aside className="command-dock" aria-label="Quick actions">
      <div className="command-dock__status">
        <span>{activeSession ? activeSession.mode.replace("_", " ") : "No active capture"}</span>
        <strong>{activeSession?.title ?? `${processingCount} sessions ready`}</strong>
      </div>
      <div className="command-dock__actions">
        <button onClick={() => onNavigate("capture")} title="Open capture controls" type="button">
          Capture
        </button>
        <button onClick={() => onNavigate("inbox")} title="Review suggested memories" type="button">
          Inbox {suggestedCount}
        </button>
        <button onClick={() => onNavigate("ask-memory")} title="Ask Memory" type="button">
          Ask
        </button>
        <button onClick={() => onNavigate("settings")} title="Open settings" type="button">
          Export
        </button>
      </div>
    </aside>
  );
}

function CaptureView({
  captureCapabilities,
  refresh,
  sessions
}: {
  captureCapabilities: CaptureCapability[];
  refresh: () => Promise<void>;
  sessions: CaptureSession[];
}) {
  const activeSession = sessions.find((session) => session.status === "active" || session.status === "paused");
  const processingSession = sessions.find((session) => session.status === "processing");
  const captureSession = activeSession ?? processingSession;
  const [diagnostics, setDiagnostics] = useState<CaptureDiagnostics | undefined>();
  const [form, setForm] = useState({
    mode: "article" as CaptureMode,
    sourceTitle: "",
    sourceUrl: "",
    title: ""
  });
  const [importantNote, setImportantNote] = useState("");
  const [actionError, setActionError] = useState<string | undefined>();
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!captureSession) {
      setDiagnostics(undefined);
      return;
    }
    let cancelled = false;
    const loadDiagnostics = async () => {
      const nextDiagnostics = await fetchCaptureDiagnosticsRequest(captureSession.id);
      if (!cancelled) {
        setDiagnostics(nextDiagnostics);
      }
    };
    loadDiagnostics();
    const interval = window.setInterval(loadDiagnostics, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [captureSession?.id]);

  async function runAction(action: () => Promise<void>) {
    setActionError(undefined);
    setActionMessage(undefined);
    setIsWorking(true);
    try {
      await action();
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Capture action failed");
    } finally {
      setIsWorking(false);
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
              <span>{diagnostics?.summary.artifactCount ?? 0} artifacts captured</span>
              <span>{captureStateLabel(diagnostics?.summary.state ?? "waiting_for_artifacts")}</span>
              <span>Started {new Date(activeSession.startedAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="button-row">
            <button
              className="primary-button"
              disabled={isWorking}
              onClick={() => runAction(() => updateSessionRequest(activeSession.id, { status: paused ? "active" : "paused" }).then())}
              type="button"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              className="secondary-button"
              disabled={isWorking}
              onClick={() =>
                runAction(async () => {
                  await updateSessionRequest(activeSession.id, { endedAt: new Date().toISOString(), status: "processing" });
                  const result = await processSessionRequest(activeSession.id);
                  setActionMessage(
                    `Processed ${result.memoryCount} memories${result.exportResult ? ` and exported ${result.exportResult.fileCount} files` : ""}.`
                  );
                })
              }
              type="button"
            >
              {isWorking ? "Processing..." : "Stop & Process"}
            </button>
          </div>
        </Panel>
        <CaptureEvidencePanel diagnostics={diagnostics} />
        <CaptureSourcesPanel capabilities={captureCapabilities} />
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
        {actionMessage ? <div className="notice notice--success">{actionMessage}</div> : null}
        {actionError ? <div className="notice">{actionError}</div> : null}
      </div>
    );
  }

  if (processingSession) {
    return (
      <div className="capture-layout">
        <Panel title="Ready To Process">
          <div className="active-capture">
            <div>
              <strong>{processingSession.title}</strong>
              <span>
                {processingSession.mode.replace("_", " ")} · automatic export after processing
              </span>
            </div>
            <div className="button-row">
              <button
                className="primary-button"
                disabled={isWorking}
                onClick={() =>
                  runAction(async () => {
                    const result = await processSessionRequest(processingSession.id);
                    setActionMessage(
                      `Processed ${result.memoryCount} memories${result.exportResult ? ` and exported ${result.exportResult.fileCount} files` : ""}.`
                    );
                  })
                }
                type="button"
              >
                {isWorking ? "Processing..." : "Process Session"}
              </button>
              <button
                className="secondary-button"
                onClick={() => runAction(() => updateSessionRequest(processingSession.id, { status: "active" }).then())}
                type="button"
              >
                Resume Capture
              </button>
            </div>
          </div>
        </Panel>
        <CaptureEvidencePanel diagnostics={diagnostics} />
        <CaptureSourcesPanel capabilities={captureCapabilities} />
        {actionMessage ? <div className="notice notice--success">{actionMessage}</div> : null}
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
      <CaptureSourcesPanel capabilities={captureCapabilities} />
      {actionError ? <div className="notice">{actionError}</div> : null}
    </div>
  );
}

function CaptureEvidencePanel({ diagnostics }: { diagnostics?: CaptureDiagnostics }) {
  const typeSummary = summarizeArtifactTypes(diagnostics);

  return (
    <Panel title="Evidence Feed">
      <div className="evidence-summary">
        <span>{captureStateLabel(diagnostics?.summary.state ?? "waiting_for_artifacts")}</span>
        <strong>{diagnostics?.summary.artifactCount ?? 0} artifacts</strong>
        <span>{diagnostics?.summary.capturedTextCharacters ?? 0} captured text chars</span>
      </div>
      {typeSummary.length > 0 ? (
        <div className="artifact-type-list">
          {typeSummary.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : (
        <p className="source-line">Open or reload a normal web article tab while capture is active. Evidence should appear here within a few seconds.</p>
      )}
      {diagnostics?.recentArtifacts.length ? (
        <ul className="evidence-list">
          {diagnostics.recentArtifacts.map((artifact) => (
            <li key={artifact.id}>
              <strong>{formatArtifactPreview(artifact)}</strong>
              <span>{new Date(artifact.createdAt).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

function CaptureSourcesPanel({ capabilities }: { capabilities: CaptureCapability[] }) {
  return (
    <Panel title="Capture Surfaces">
      <div className="surface-list">
        {capabilities.length > 0 ? (
          capabilities.map((capability) => (
            <article className="surface-item" key={capability.sourceType}>
              <div>
                <strong>{capability.sourceType.replace("_", " ")}</strong>
                <span>{capability.artifactTypes.slice(0, 4).join(" · ")}</span>
              </div>
              <p>{capability.permissionNotes}</p>
            </article>
          ))
        ) : (
          <p>Capture capabilities load from the local API.</p>
        )}
      </div>
    </Panel>
  );
}

function Home({ memories, sessions }: { memories: MemoryCard[]; sessions: CaptureSession[] }) {
  const recentSessions = sessions.slice(0, 5);
  const suggestedCount = memories.filter((memory) => memory.status === "suggested").length;
  const approvedCount = memories.filter((memory) => memory.status === "approved").length;

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
        <p>{suggestedCount} cards need review.</p>
      </Panel>
      <Panel title="Approved Memories">
        <p>{approvedCount} approved cards are ready for search, topics, and reader pages.</p>
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

function TopicsView({
  memories,
  readerPages,
  sessions
}: {
  memories: MemoryCard[];
  readerPages: ReaderPage[];
  sessions: CaptureSession[];
}) {
  const approvedOrSuggested = memories.filter((memory) => memory.status !== "rejected" && memory.status !== "archived");
  const topics = Object.entries(
    approvedOrSuggested.reduce<Record<string, MemoryCard[]>>((acc, memory) => {
      acc[memory.category] = [...(acc[memory.category] ?? []), memory];
      return acc;
    }, {})
  );

  if (topics.length === 0) {
    return (
      <Panel title="Topics">
        <p>Topics appear after sessions are processed into memory cards.</p>
      </Panel>
    );
  }

  return (
    <div className="topic-grid">
      {topics.map(([topic, topicMemories]) => {
        const relatedSessionIds = new Set(topicMemories.map((memory) => memory.sessionId).filter(Boolean));
        const relatedPages = readerPages.filter((page) => page.sourceSessionId && relatedSessionIds.has(page.sourceSessionId));
        const relatedSessions = sessions.filter((session) => relatedSessionIds.has(session.id));
        return (
          <article className="topic-card" key={topic}>
            <div className="memory-card__meta">
              <span>{topicMemories.length} memories</span>
              <span>{relatedPages.length} pages</span>
            </div>
            <h2>{topic.replace("_", " ")}</h2>
            <p>{topicMemories[0]?.summary}</p>
            <div className="topic-card__section">
              <strong>Recent sessions</strong>
              {relatedSessions.slice(0, 3).map((session) => (
                <span key={session.id}>{session.title}</span>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function InboxView({
  links,
  memories,
  refresh,
  sessions
}: {
  links: MemoryLink[];
  memories: MemoryCard[];
  refresh: () => Promise<void>;
  sessions: CaptureSession[];
}) {
  const suggested = memories.filter((memory) => memory.status === "suggested");

  if (suggested.length === 0) {
    return (
      <Panel title="Inbox">
        <p>No suggested memories are waiting. Process a capture session to generate review cards.</p>
      </Panel>
    );
  }

  return (
    <div className="inbox-list">
      {suggested.map((memory) => (
        <MemoryReviewCard key={memory.id} links={links} memory={memory} refresh={refresh} sessions={sessions} />
      ))}
    </div>
  );
}

function LibraryView({
  links,
  memories,
  readerPages,
  sessions
}: {
  links: MemoryLink[];
  memories: MemoryCard[];
  readerPages: ReaderPage[];
  sessions: CaptureSession[];
}) {
  const [selectedPageId, setSelectedPageId] = useState(readerPages[0]?.id);
  const selectedPage = readerPages.find((page) => page.id === selectedPageId) ?? readerPages[0];
  const grouped = sessions.reduce<Record<string, CaptureSession[]>>((acc, session) => {
    acc[session.mode] = [...(acc[session.mode] ?? []), session];
    return acc;
  }, {});
  const pageMemories = selectedPage?.sourceSessionId
    ? memories.filter((memory) => memory.sessionId === selectedPage.sourceSessionId && memory.status !== "rejected")
    : [];
  const relatedLinks = pageMemories.flatMap((memory) => links.filter((link) => link.sourceMemoryId === memory.id || link.targetMemoryId === memory.id));

  if (!selectedPage) {
    return (
      <Panel title="Library">
        <p>No reader pages yet. Process a capture session to create your first session page.</p>
      </Panel>
    );
  }

  return (
    <div className="library-layout">
      <aside className="library-sidebar">
        {Object.entries(grouped).map(([mode, modeSessions]) => (
          <section key={mode}>
            <h2>{mode.replace("_", " ")}</h2>
            {modeSessions.map((session) => {
              const page = readerPages.find((readerPage) => readerPage.sourceSessionId === session.id);
              return (
                <button
                  className="library-page-button"
                  disabled={!page}
                  key={session.id}
                  onClick={() => page && setSelectedPageId(page.id)}
                  type="button"
                >
                  {session.title}
                </button>
              );
            })}
          </section>
        ))}
      </aside>
      <article className="reader-page">
        <MarkdownView markdown={selectedPage.contentMarkdown} />
        <section className="reader-page__links">
          <h2>Backlinks and Evidence</h2>
          {pageMemories.length > 0 ? (
            <ul>
              {pageMemories.map((memory) => (
                <li key={memory.id}>{memory.title}</li>
              ))}
            </ul>
          ) : (
            <p>No approved or suggested memories are attached to this page yet.</p>
          )}
          {relatedLinks.length > 0 ? (
            <ul>
              {relatedLinks.map((link) => (
                <li key={link.id}>{link.reason}</li>
              ))}
            </ul>
          ) : null}
        </section>
      </article>
    </div>
  );
}

function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="markdown-view">
      {markdown.split("\n").map((line, index) => {
        if (line.startsWith("# ")) return <h1 key={index}>{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={index}>{line.slice(3)}</h2>;
        if (line.startsWith("- ")) return <li key={index}>{line.slice(2)}</li>;
        if (!line.trim()) return <br key={index} />;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | undefined>();

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      setResults(await searchMemoryRequest(query));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed");
    }
  }

  return (
    <div className="search-page">
      <Panel title="Search Memory">
        <form className="search-form" onSubmit={runSearch}>
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search across memories, pages, sessions, artifacts" value={query} />
          <button className="primary-button" type="submit">
            Search
          </button>
        </form>
      </Panel>
      {error ? <div className="notice">{error}</div> : null}
      <ResultList results={results} />
    </div>
  );
}

function AskMemoryView() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskMemoryAnswer | undefined>();
  const [error, setError] = useState<string | undefined>();

  async function ask(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      setAnswer(await askMemoryRequest(question));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ask Memory failed");
    }
  }

  return (
    <div className="search-page">
      <Panel title="Ask Memory">
        <form className="form-stack" onSubmit={ask}>
          <textarea onChange={(event) => setQuestion(event.target.value)} placeholder="What did I learn about frontend performance?" rows={4} value={question} />
          <button className="primary-button" type="submit">
            Ask
          </button>
        </form>
      </Panel>
      {error ? <div className="notice">{error}</div> : null}
      {answer ? (
        <section className="answer-panel">
          <h2>Answer</h2>
          <p>{answer.answer}</p>
          <h2>Sources</h2>
          <ResultList results={answer.sources} />
        </section>
      ) : null}
    </div>
  );
}

function ResultList({ results }: { results: SearchResult[] }) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="result-list">
      {results.map((result) => (
        <article className="result-item" key={`${result.recordType}-${result.recordId}`}>
          <div className="memory-card__meta">
            <span>{result.recordType.replace("_", " ")}</span>
            <span>{result.sourceType}</span>
            <span>{result.status}</span>
          </div>
          <h2>{result.title}</h2>
          <p>{result.summary || result.snippet}</p>
        </article>
      ))}
    </div>
  );
}

function RevisionView({ refresh, revisionItems }: { refresh: () => Promise<void>; revisionItems: RevisionItem[] }) {
  if (revisionItems.length === 0) {
    return (
      <Panel title="Revision">
        <p>No revision questions yet. Learning, article, video, and interview sessions generate questions during processing.</p>
      </Panel>
    );
  }

  return (
    <div className="revision-list">
      {revisionItems.map((item) => (
        <article className="revision-item" key={item.id}>
          <div className="memory-card__meta">
            <span>{item.difficulty}</span>
            <span>{item.status}</span>
            {item.dueAt ? <span>due {new Date(item.dueAt).toLocaleDateString()}</span> : null}
          </div>
          <h2>{item.question}</h2>
          {item.answer ? <p>{item.answer}</p> : null}
          <div className="button-row">
            <button
              className="secondary-button"
              onClick={async () => {
                await updateRevisionItemRequest(item.id, "reviewed");
                await refresh();
              }}
              type="button"
            >
              Reviewed
            </button>
            <button
              className="primary-button"
              onClick={async () => {
                await updateRevisionItemRequest(item.id, "mastered");
                await refresh();
              }}
              type="button"
            >
              Mastered
            </button>
            <button
              className="secondary-button"
              onClick={async () => {
                await updateRevisionItemRequest(item.id, "skipped");
                await refresh();
              }}
              type="button"
            >
              Skip
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function SettingsView({ aiLabel }: { aiLabel: string }) {
  const [exportDir, setExportDir] = useState("");
  const [exportResult, setExportResult] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  async function exportVault(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      const result = await exportMarkdownRequest(exportDir);
      setExportResult(`Exported ${result.fileCount} files to ${result.exportDir}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export failed");
    }
  }

  return (
    <div className="settings-page">
      <Panel title="Settings">
        <dl className="settings-list">
          <div>
            <dt>Data directory</dt>
            <dd>Local SQLite and artifact storage, configurable through the API environment.</dd>
          </div>
          <div>
            <dt>Markdown export directory</dt>
            <dd>Sessions auto-export after processing; this control can refresh the vault on demand.</dd>
          </div>
          <div>
            <dt>Extension pairing</dt>
            <dd>Chrome extension pairing is local-only and session-scoped.</dd>
          </div>
          <div>
            <dt>Privacy</dt>
            <dd>Raw audio/video retention is off by default; derived artifacts are kept locally.</dd>
          </div>
          <div>
            <dt>Retention policies</dt>
            <dd>Raw media cleanup, app/domain exclusions, private capture mode, and encryption controls.</dd>
          </div>
          <div>
            <dt>AI provider</dt>
            <dd>{aiLabel}</dd>
          </div>
          <div>
            <dt>Obsidian graph</dt>
            <dd>Markdown export includes `Graph/continuum-graph.json` and a Mermaid graph page.</dd>
          </div>
        </dl>
      </Panel>
      <Panel title="Markdown Export">
        <form className="form-stack" onSubmit={exportVault}>
          <label>
            Export directory
            <input
              onChange={(event) => setExportDir(event.target.value)}
              placeholder="Leave blank for the default local memory-vault"
              value={exportDir}
            />
          </label>
          <button className="primary-button" type="submit">
            Export Markdown
          </button>
        </form>
        {exportResult ? <p className="source-line">{exportResult}</p> : null}
        {error ? <div className="notice">{error}</div> : null}
      </Panel>
    </div>
  );
}

function MemoryReviewCard({
  links,
  memory,
  refresh,
  sessions
}: {
  links: MemoryLink[];
  memory: MemoryCard;
  refresh: () => Promise<void>;
  sessions: CaptureSession[];
}) {
  const [title, setTitle] = useState(memory.title);
  const [summary, setSummary] = useState(memory.summary);
  const sourceSession = sessions.find((session) => session.id === memory.sessionId);
  const relatedLinks = links.filter((link) => link.sourceMemoryId === memory.id || link.targetMemoryId === memory.id);

  async function run(action: () => Promise<void>) {
    await action();
    await refresh();
  }

  return (
    <section className="memory-card">
      <div className="memory-card__meta">
        <span>{memory.category}</span>
        <span>{memory.memoryType}</span>
        <span>importance {memory.importance}</span>
      </div>
      <label>
        Title
        <input onChange={(event) => setTitle(event.target.value)} value={title} />
      </label>
      <label>
        Summary
        <textarea onChange={(event) => setSummary(event.target.value)} rows={4} value={summary} />
      </label>
      {sourceSession ? <p className="source-line">Source session: {sourceSession.title}</p> : null}
      {relatedLinks.length > 0 ? (
        <ul className="related-list">
          {relatedLinks.map((link) => (
            <li key={link.id}>{link.reason}</li>
          ))}
        </ul>
      ) : (
        <p className="source-line">No related-memory links suggested yet.</p>
      )}
      <div className="button-row">
        <button className="secondary-button" onClick={() => run(() => updateMemoryRequest(memory.id, { summary, title }).then())} type="button">
          Save Edit
        </button>
        <button className="primary-button" onClick={() => run(() => approveMemoryRequest(memory.id))} type="button">
          Approve
        </button>
        <button className="secondary-button" onClick={() => run(() => rejectMemoryRequest(memory.id))} type="button">
          Reject
        </button>
        <button className="secondary-button" onClick={() => run(() => updateMemoryRequest(memory.id, { status: "archived" }).then())} type="button">
          Archive
        </button>
      </div>
    </section>
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
