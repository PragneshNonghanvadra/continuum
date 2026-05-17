# Continuum macOS Packaging Workflow

Continuum ships as a macOS-first Tauri desktop app with three local companions:

- `apps/local-api`: Bun/Hono API on `127.0.0.1:5174`.
- `apps/native-helper`: Swift helper for explicit-session native app, OCR, and media metadata capture.
- `apps/chrome-extension`: MV3 extension for explicit-session browser evidence.

## Build Order

1. Install Bun dependencies:
   ```bash
   bun install
   ```
2. Run full verification:
   ```bash
   bun run verify
   ```
3. Build distributable desktop assets:
   ```bash
   bun run build
   ```
4. Build the Tauri bundle on a machine with Rust/Cargo installed:
   ```bash
   bun run --cwd apps/desktop tauri build
   ```

## Native Helper

The Swift helper currently builds as:

```bash
swift build --package-path apps/native-helper
```

The debug binary lands under `apps/native-helper/.build/.../continuum-native-capture`. Packaged builds should either bundle that binary in the app resources or set:

```bash
CONTINUUM_NATIVE_HELPER_PATH=/path/to/continuum-native-capture
```

The helper emits only derived artifacts by default. OCR deletes temporary screenshots after text extraction unless raw retention is explicitly enabled.

## Extension

Build the extension before loading it in Chrome:

```bash
bun run --cwd apps/chrome-extension build
```

Load `apps/chrome-extension/dist-extension` as an unpacked extension. It captures only the active browser tab while a Continuum session is active and paired.

## AI Bridge

For strict AI-first testing, run the bridge and point Continuum at it:

```bash
CONTINUUM_CODEX_BRIDGE_PROVIDER=http \
CONTINUUM_CODEX_BRIDGE_UPSTREAM_URL=http://127.0.0.1:4010/continuum/process \
bun run dev:ai-bridge
```

Then run the API with:

```bash
CONTINUUM_AI_ENABLED=true \
CONTINUUM_AI_PROVIDER=codex_app_server \
CONTINUUM_CODEX_AI_ENDPOINT=http://127.0.0.1:4010/continuum/process \
CONTINUUM_AI_REQUIRE_PROVIDER=true \
bun run dev:api
```

The bridge fixture provider is for automated tests only.
