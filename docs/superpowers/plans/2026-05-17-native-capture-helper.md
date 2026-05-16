# Native Capture Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the macOS native capture layer that automatically captures useful evidence from non-browser apps during an explicit Continuum session.

**Architecture:** Add a small macOS Swift CLI helper for Accessibility, active-window metadata, screenshots, Vision OCR, and media-app metadata. The Tauri backend owns helper lifecycle and the helper posts normalized artifacts into the existing local API `/api/native-capture/events`, preserving the explicit-session and no-always-on model.

**Tech Stack:** Tauri v2, React, Bun/TypeScript, Hono API, SQLite, Swift Package Manager, macOS Accessibility APIs, ScreenCaptureKit/CoreGraphics, Vision OCR.

---

## File Structure

- Create `apps/native-helper/Package.swift`: Swift package definition for the macOS helper and tests.
- Create `apps/native-helper/Sources/ContinuumNativeCapture/main.swift`: CLI entrypoint with `capabilities`, `sample`, and `run` commands.
- Create `apps/native-helper/Sources/ContinuumNativeCapture/Models.swift`: Codable request/response models matching Continuum API artifact/source shapes.
- Create `apps/native-helper/Sources/ContinuumNativeCapture/AccessibilitySampler.swift`: frontmost app, bundle id, window title, selected text, document path/url.
- Create `apps/native-helper/Sources/ContinuumNativeCapture/WindowSnapshotter.swift`: active-window screenshot/keyframe capture with raw-image retention disabled by default.
- Create `apps/native-helper/Sources/ContinuumNativeCapture/OcrService.swift`: Vision OCR over screenshots into `ocr_text` and `native_window_snapshot` artifacts.
- Create `apps/native-helper/Sources/ContinuumNativeCapture/MediaAppSampler.swift`: adapters for Music, QuickTime, Podcasts, VLC-style metadata when exposed by app scripting/accessibility.
- Create `apps/native-helper/Sources/ContinuumNativeCapture/ContinuumApiClient.swift`: local API client for `/api/native-capture/events`.
- Create `apps/native-helper/Tests/ContinuumNativeCaptureTests/*.swift`: fixture-driven tests that do not require screen/audio permissions.
- Modify `apps/desktop/src-tauri/Cargo.toml`: add process/lifecycle dependencies only if needed.
- Modify `apps/desktop/src-tauri/src/lib.rs`: register native capture Tauri commands.
- Create `apps/desktop/src-tauri/src/native_capture.rs`: start/stop/status commands and helper process lifecycle.
- Modify `apps/desktop/src/api.ts`: add native capture status bridge if frontend needs it.
- Modify `apps/desktop/src/App.tsx`: show permission/helper status in Capture and Settings.
- Modify `apps/desktop/src/styles.css`: small status styling only.
- Modify `package.json`: add scripts for helper build/test.

## Task 1: Swift Helper Scaffold

**Files:**
- Create `apps/native-helper/Package.swift`
- Create `apps/native-helper/Sources/ContinuumNativeCapture/main.swift`
- Create `apps/native-helper/Sources/ContinuumNativeCapture/Models.swift`
- Create `apps/native-helper/Tests/ContinuumNativeCaptureTests/ModelsTests.swift`
- Modify `package.json`

- [ ] **Step 1: Write the failing model test**

Create `apps/native-helper/Tests/ContinuumNativeCaptureTests/ModelsTests.swift`:

```swift
import XCTest
@testable import ContinuumNativeCapture

final class ModelsTests: XCTestCase {
    func testNativeCaptureEventEncodesContinuumApiShape() throws {
        let event = NativeCaptureEvent(
            sessionId: "session_1",
            source: CaptureSourceInput(
                sourceType: "macos_app",
                appName: "Preview",
                bundleId: "com.apple.Preview",
                windowTitle: "paper.pdf",
                sourceUrl: nil,
                filePath: "/Users/me/Downloads/paper.pdf",
                captureCapabilities: ["document_text", "ocr_text"],
                permissionState: "granted",
                metadata: ["frontmost": .bool(true)]
            ),
            artifacts: [
                ArtifactInput(
                    artifactType: "document_text",
                    content: "Extracted text",
                    filePath: nil,
                    timestampStart: nil,
                    timestampEnd: nil,
                    metadata: ["source": .string("accessibility")]
                )
            ],
            occurredAt: "2026-05-17T00:00:00.000Z"
        )

        let data = try JSONEncoder.continuum.encode(event)
        let json = String(data: data, encoding: .utf8)!

        XCTAssertTrue(json.contains("\"sessionId\":\"session_1\""))
        XCTAssertTrue(json.contains("\"sourceType\":\"macos_app\""))
        XCTAssertTrue(json.contains("\"artifactType\":\"document_text\""))
    }
}
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
swift test --package-path apps/native-helper
```

Expected: FAIL because the Swift package and models do not exist.

- [ ] **Step 3: Add the helper package and models**

Create `Package.swift`, `Models.swift`, and a minimal `main.swift` that supports `capabilities` and prints JSON. Models must encode camelCase keys because the local API already expects `sessionId`, `sourceType`, and `artifactType`.

- [ ] **Step 4: Verify**

Run:

```bash
swift test --package-path apps/native-helper
bun run typecheck
```

Expected: Swift test passes, TypeScript still passes.

- [ ] **Step 5: Commit**

```bash
git add package.json apps/native-helper
git commit -m "feat(native): scaffold macOS capture helper"
```

## Task 2: Accessibility Sampler

**Files:**
- Create `apps/native-helper/Sources/ContinuumNativeCapture/AccessibilitySampler.swift`
- Create `apps/native-helper/Tests/ContinuumNativeCaptureTests/AccessibilitySamplerTests.swift`

- [ ] **Step 1: Write fixture-driven tests**

Test that a frontmost-app fixture maps to a `CaptureSourceInput` with `sourceType: "macos_app"` and selected/document text maps to `native_app_text` or `document_text`.

- [ ] **Step 2: Implement sampler boundary**

Add:

```swift
protocol AccessibilitySampling {
    func sampleFrontmostApplication() throws -> AccessibilitySample
}
```

Implement the real sampler with Accessibility APIs, but keep tests on a fixture sampler so CI does not require macOS permissions.

- [ ] **Step 3: Permission behavior**

If Accessibility is not trusted, emit source `permissionState: "prompt_required"` and no text artifact. Do not request capture silently in a loop.

- [ ] **Step 4: Verify**

Run:

```bash
swift test --package-path apps/native-helper
```

Expected: tests pass without requiring Accessibility permission.

- [ ] **Step 5: Commit**

```bash
git add apps/native-helper
git commit -m "feat(native): sample frontmost macOS app context"
```

## Task 3: Screenshot And OCR Capture

**Files:**
- Create `apps/native-helper/Sources/ContinuumNativeCapture/WindowSnapshotter.swift`
- Create `apps/native-helper/Sources/ContinuumNativeCapture/OcrService.swift`
- Create `apps/native-helper/Tests/ContinuumNativeCaptureTests/OcrServiceTests.swift`

- [ ] **Step 1: Write OCR tests**

Use a tiny generated fixture image containing text `Continuum OCR fixture`. The test asserts that OCR output creates an `ocr_text` artifact and that raw screenshot retention defaults to false.

- [ ] **Step 2: Implement screenshot capture**

Capture the active/frontmost window when Screen Recording permission is available. Store temporary screenshots under the system temp directory, post derived OCR artifacts, then delete the screenshot unless retention is explicitly enabled.

- [ ] **Step 3: Implement Vision OCR**

Use `VNRecognizeTextRequest` with accurate recognition for document windows and fast recognition for periodic snapshots.

- [ ] **Step 4: Verify**

Run:

```bash
swift test --package-path apps/native-helper
bun run test packages/core/src/db/captureSourceRepository.test.ts
```

Expected: helper tests pass and API ingestion tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/native-helper
git commit -m "feat(native): capture window OCR evidence"
```

## Task 4: Media App Metadata Sampler

**Files:**
- Create `apps/native-helper/Sources/ContinuumNativeCapture/MediaAppSampler.swift`
- Create `apps/native-helper/Tests/ContinuumNativeCaptureTests/MediaAppSamplerTests.swift`

- [ ] **Step 1: Write media mapping tests**

Fixture input for Music/QuickTime/Podcasts should produce `system_audio` source plus `system_audio_metadata` artifact with `trackTitle`, `appName`, and `currentTime` when available.

- [ ] **Step 2: Implement adapters**

Add best-effort samplers:
- Music/Podcasts through AppleScript metadata when available.
- QuickTime/VLC through Accessibility window title and playback timestamp when exposed.
- Fallback to app/window metadata only.

- [ ] **Step 3: Verify**

Run:

```bash
swift test --package-path apps/native-helper
```

Expected: fixture tests pass without needing media apps open.

- [ ] **Step 4: Commit**

```bash
git add apps/native-helper
git commit -m "feat(native): capture media app metadata"
```

## Task 5: Tauri Helper Lifecycle

**Files:**
- Modify `apps/desktop/src-tauri/src/lib.rs`
- Create `apps/desktop/src-tauri/src/native_capture.rs`
- Modify `apps/desktop/src/api.ts`
- Modify `apps/desktop/src/App.tsx`
- Modify `apps/desktop/src/styles.css`

- [ ] **Step 1: Add Tauri command tests where practical**

Rust unit tests should cover command state transitions: idle → running → stopped. Keep process spawning behind a trait so tests do not launch the real helper.

- [ ] **Step 2: Implement commands**

Expose:

```rust
#[tauri::command]
fn native_capture_status() -> NativeCaptureStatus

#[tauri::command]
async fn native_capture_start(session_id: String, api_base_url: String) -> Result<NativeCaptureStatus, String>

#[tauri::command]
async fn native_capture_stop() -> Result<NativeCaptureStatus, String>
```

- [ ] **Step 3: Wire frontend**

When a session becomes active, show a native capture toggle and permission/helper status. Do not start native capture unless there is an explicit active session.

- [ ] **Step 4: Verify**

Run:

```bash
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
bun run typecheck
bun run test apps/desktop/src
```

Expected: Rust and desktop tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src-tauri apps/desktop/src
git commit -m "feat(desktop): manage native capture helper lifecycle"
```

## Task 6: End-To-End Native Capture Flow

**Files:**
- Create `apps/local-api/src/nativeCaptureFlow.e2e.test.ts`
- Modify `apps/desktop/src-tauri/tauri.conf.json` if helper bundling is needed.
- Modify `README.md` or create `docs/native-capture.md`

- [ ] **Step 1: Add API-level e2e test**

Test a simulated native helper POST:
1. Create active session.
2. POST `/api/native-capture/events` with `file_document` source and `document_text` artifact.
3. Stop/process session.
4. Assert memory cards, reader page, and auto-export graph exist.

- [ ] **Step 2: Add manual macOS verification doc**

Document exact manual checks:
1. Start Continuum API and desktop.
2. Start a capture session.
3. Open Preview with a PDF.
4. Enable native capture.
5. Verify `document_text` or `ocr_text` artifact appears.
6. Process session.
7. Verify Markdown and graph export.

- [ ] **Step 3: Verify full repo**

Run:

```bash
bun run test
bun run typecheck
bun run build
swift test --package-path apps/native-helper
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/local-api/src/nativeCaptureFlow.e2e.test.ts docs/native-capture.md apps/desktop/src-tauri/tauri.conf.json
git commit -m "test: cover native capture memory flow"
```

## Self-Review

- Spec coverage: This plan covers non-browser native capture for Preview/PDF/document readers, native app windows, screenshots/OCR, downloaded audio/media-app metadata, explicit-session lifecycle, local API ingestion, processing, auto-export, and Obsidian graph output.
- Intentional capture: Native helper starts only from an active Continuum session and stops explicitly.
- Privacy: raw screenshots are temporary by default; raw audio recording is not introduced in this layer.
- Gaps: full system-audio transcription is intentionally not part of this layer because it needs a separate ScreenCaptureKit audio/transcription plan and stronger permission UX.
