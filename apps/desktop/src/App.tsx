import { CONTINUUM_PRODUCT_NAME } from "@continuum/core";

const navItems = ["Home", "Capture", "Inbox", "Library", "Topics", "Revision", "Search", "Ask Memory", "Settings"];

export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">{CONTINUUM_PRODUCT_NAME}</div>
        <nav>
          {navItems.map((item) => (
            <button className="nav-item" key={item} type="button">
              {item}
            </button>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="page-header">
          <p>Desktop capture memory system</p>
          <h1>Intentional capture, local memory.</h1>
        </header>
        <div className="empty-state">
          <h2>Ready for the first capture loop</h2>
          <p>Create a session, capture browser evidence, process it into suggested memories, and read the generated page.</p>
        </div>
      </section>
    </main>
  );
}
