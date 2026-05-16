# Continuum

Continuum is a local-first personal memory capture system. The MVP is a macOS-first desktop app with a local API, SQLite storage, and a Chrome extension for explicit browser capture sessions.

## Workspace

- `apps/desktop` - Tauri + React desktop shell.
- `apps/local-api` - Bun local API on `127.0.0.1`.
- `apps/chrome-extension` - Chrome MV3 capture extension.
- `packages/core` - Shared domain types, storage, processing, search, and export code.

## Commands

```bash
bun install
bun run dev:api
bun run dev:desktop
bun run test
bun run typecheck
```
