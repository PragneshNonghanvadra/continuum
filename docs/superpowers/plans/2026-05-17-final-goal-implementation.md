# Continuum Final Goal Implementation Plan

> **Execution rule:** Implement task-by-task, verify each task, and commit each completed slice with the listed message. This plan expands the current capture MVP into the AI-first desktop memory system requested by the product goal.

**Goal:** Ship a macOS-first Continuum app that can explicitly capture browser and native-app activity, process sessions with a real configurable AI layer, generate useful memory cards/pages/revision material, automatically export Obsidian-compatible Markdown/graph files, and provide a modern floating desktop experience with end-to-end verification.

**Current baseline:** The repo already includes a Tauri/React desktop shell, Bun/Hono local API, SQLite storage, Chrome extension capture, deterministic and provider-backed session processing, auto Markdown export, modernized UI, capture diagnostics, privacy defaults, and an architectural plan for the native macOS helper.

---

## Remaining Work Map

### Track 1: AI-First Processing

- [ ] **Task 1.1: Codex-compatible AI bridge app**
  - Add `apps/codex-ai-bridge` as a local HTTP bridge implementing `/health` and `/continuum/process`.
  - Accept the existing `AiGenerationRequest` contract and return strict `ProcessSessionResult`.
  - Include a fixture provider for tests and an upstream HTTP adapter for real model servers.
  - Add tests proving request validation, health output, and process response shape.
  - Commit: `feat(ai): add codex-compatible bridge service`

- [ ] **Task 1.2: AI-backed Ask Memory**
  - Add an `AskMemoryProvider` abstraction that reuses configured AI providers.
  - Retrieve source memories/pages first, then ask AI to synthesize only from those sources.
  - Keep deterministic fallback available, but surface strict-mode errors when AI is required.
  - Add API tests for source-cited answers and unsupported-answer behavior.
  - Commit: `feat(memory): add AI-backed ask memory synthesis`

- [ ] **Task 1.3: Provider health and model controls**
  - Add API endpoints for AI provider health checks and generation diagnostics.
  - Add Settings UI for provider kind, endpoint, model, strict mode, and last failure.
  - Do not store API keys in app state yet; read them from environment until secure storage lands.
  - Commit: `feat(desktop): add AI provider controls`

### Track 2: Native macOS Capture

- [ ] **Task 2.1: Swift helper scaffold**
  - Build `apps/native-helper` with Codable API models and fixture tests.
  - Add root scripts for build/test.
  - Commit: `feat(native): scaffold macOS capture helper`

- [ ] **Task 2.2: Accessibility app context**
  - Sample frontmost app, bundle id, window title, selected text, URL/document path where available.
  - Emit permission-aware source records and text artifacts.
  - Commit: `feat(native): sample frontmost macOS app context`

- [ ] **Task 2.3: Screenshot OCR evidence**
  - Add active-window screenshot capture and Vision OCR.
  - Delete raw screenshots by default after derived OCR artifacts.
  - Commit: `feat(native): capture window OCR evidence`

- [ ] **Task 2.4: Media app metadata**
  - Capture best-effort metadata from Music, Podcasts, QuickTime, VLC-style windows, and generic media players.
  - Emit timestamps and source metadata without retaining raw audio/video.
  - Commit: `feat(native): capture media app metadata`

- [ ] **Task 2.5: Tauri helper lifecycle**
  - Start/stop helper with explicit Continuum sessions.
  - Show permission/helper status in Capture and Settings.
  - Commit: `feat(desktop): manage native capture helper`

### Track 3: Audio, Transcription, And Media Understanding

- [ ] **Task 3.1: Transcription runtime adapters**
  - Extend `TranscriptionProvider` with local-command and HTTP adapters.
  - Add disabled-by-default cloud adapter config and strict error reporting.
  - Commit: `feat(processing): add configurable transcription adapters`

- [ ] **Task 3.2: Audio session ingestion**
  - Add endpoints for transcript segments and media timeline artifacts.
  - Normalize native/browser captions and transcripts into session artifacts.
  - Commit: `feat(api): add media transcript ingestion`

- [ ] **Task 3.3: Media timeline reader output**
  - Render timestamps, captions, key moments, and important markers in session pages.
  - Export media evidence into Obsidian-readable Markdown.
  - Commit: `feat(reader): add media timeline evidence`

### Track 4: Knowledge Graph And Obsidian Export

- [ ] **Task 4.1: Graph export hardening**
  - Export memory/topic/session graph data as Markdown links plus JSON sidecar files.
  - Include link reasons, relation types, and topic clusters.
  - Commit: `feat(export): enrich obsidian knowledge graph export`

- [ ] **Task 4.2: Topic and revision auto-regeneration**
  - Regenerate topic pages/revision packs after approval/edit/rejection changes.
  - Keep exported vault synchronized automatically after each processed session and review action.
  - Commit: `feat(memory): regenerate topic and revision pages`

- [ ] **Task 4.3: Semantic-search-ready layer**
  - Add embedding provider interface, embedding storage tables, and vector-adapter boundary.
  - Keep keyword FTS as fallback and use semantic reranking when configured.
  - Commit: `feat(memory): add semantic search provider boundary`

### Track 5: Floating Desktop Experience

- [ ] **Task 5.1: Floating capture HUD**
  - Add a compact always-visible Tauri window for active session status, pause/mark-important/stop, and captured evidence count.
  - It must appear only after explicit session start.
  - Commit: `feat(desktop): add floating capture hud`

- [ ] **Task 5.2: Modern reader workspace**
  - Refine layout, density, command entry, and reader surfaces using current design-system patterns.
  - Add clearer captured-evidence, generated-memory, and export-state affordances.
  - Commit: `feat(desktop): refine modern reader workspace`

### Track 6: Privacy, Packaging, And Verification

- [ ] **Task 6.1: Permission and retention audit**
  - Verify deleted/rejected/raw artifacts stay hidden or deleted according to settings.
  - Add tests for raw screenshot/audio/video retention defaults.
  - Commit: `feat(privacy): enforce capture retention policy`

- [ ] **Task 6.2: Desktop packaging path**
  - Add macOS build notes, helper bundling plan, extension build packaging, and release smoke script.
  - Commit: `chore(release): add macOS packaging workflow`

- [ ] **Task 6.3: Final end-to-end test suite**
  - Cover browser capture, native capture fixture, AI bridge processing, inbox approval, reader output, Ask Memory, revision, and export.
  - Add one command for local confidence before manual testing.
  - Commit: `test: cover final continuum capture flow`

---

## Done Definition

- App starts locally with desktop UI and local API.
- A user can start an explicit session and capture evidence from Chrome or supported native macOS app contexts.
- Sessions process through a configured AI provider when strict AI mode is enabled.
- Generated memory cards, links, reader pages, revision items, topics, and exported Markdown are useful and cited.
- Ask Memory retrieves sources first and synthesizes only from them.
- Markdown vault export updates automatically and is readable in Obsidian with wiki links and graph sidecars.
- Raw media is not retained by default.
- Browser extension and native capture helper never capture without an active Continuum session.
- Full typecheck, tests, builds, and smoke checks pass.
