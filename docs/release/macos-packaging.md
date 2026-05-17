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
4. Build the Tauri `.app` bundle and simple install DMG:
   ```bash
   bun run package:mac
   ```

The script prepends `$HOME/.cargo/bin` when available so Apple Silicon rustup builds produce an arm64 Tauri binary. It creates:

- `apps/desktop/src-tauri/target/release/bundle/macos/Continuum.app`
- `apps/desktop/src-tauri/target/release/bundle/dmg/Continuum_0.1.0_aarch64.dmg`

## Native Helper

The Swift helper builds as:

```bash
swift build --package-path apps/native-helper
```

Packaged builds run `scripts/build-tauri-sidecars.sh` before the Tauri frontend build. That script compiles the helper in release mode and copies it into `apps/desktop/src-tauri/binaries/continuum-native-capture-{target-triple}` so Tauri bundles it as `Continuum.app/Contents/MacOS/continuum-native-capture`.

For local development, you can still override the helper path with:

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

For strict AI-first testing with a frontier OpenAI model, run the bridge and point Continuum at it:

```bash
OPENAI_API_KEY=... \
CONTINUUM_CODEX_BRIDGE_PROVIDER=openai_responses \
CONTINUUM_CODEX_BRIDGE_MODEL=your-model-name \
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

The bridge also supports `CONTINUUM_CODEX_BRIDGE_PROVIDER=http` for a local model server that already accepts Continuum's `{ task, schemaName, prompt, input }` contract. The bridge fixture provider is for automated tests only.
