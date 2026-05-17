import ContinuumNativeCapture
import Foundation

@main
struct ContinuumNativeCaptureModelTests {
    static func main() throws {
        try nativeCaptureEventEncodesContinuumApiShape()
        try accessibilitySampleMapsToNativeArtifacts()
        try ocrResultMapsToDerivedArtifactWithoutRawRetention()
        try ocrPipelineDeletesTemporarySnapshotByDefault()
        try mediaSampleMapsToSystemAudioMetadata()
        try captureLoopPostsAccessibilityAndMediaEvidence()
        print("ContinuumNativeCaptureModelTests passed")
    }

    private static func nativeCaptureEventEncodesContinuumApiShape() throws {
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

        try expect(json.contains("\"sessionId\":\"session_1\""), "sessionId should encode in Continuum API shape")
        try expect(json.contains("\"sourceType\":\"macos_app\""), "sourceType should encode in Continuum API shape")
        try expect(json.contains("\"artifactType\":\"document_text\""), "artifactType should encode in Continuum API shape")
    }

    private static func expect(_ condition: Bool, _ message: String) throws {
        if !condition {
            throw TestFailure(message)
        }
    }

    private static func accessibilitySampleMapsToNativeArtifacts() throws {
        let sampler = FixtureAccessibilitySampler(
            sample: AccessibilitySample(
                appName: "Preview",
                bundleId: "com.apple.Preview",
                windowTitle: "paper.pdf",
                selectedText: "Selected PDF text",
                documentText: "Document level text",
                sourceUrl: nil,
                filePath: "/Users/me/Downloads/paper.pdf",
                permissionState: "granted",
                metadata: ["fixture": .bool(true)]
            )
        )

        let event = try sampler.sampleFrontmostApplication().toNativeCaptureEvent(sessionId: "session_1")

        try expect(event.source?.sourceType == "macos_app", "Accessibility source should be a macOS app")
        try expect(event.artifacts.contains { $0.artifactType == "native_app_text" }, "Selected text should become native_app_text")
        try expect(event.artifacts.contains { $0.artifactType == "document_text" }, "Document text should become document_text")
    }

    private static func ocrResultMapsToDerivedArtifactWithoutRawRetention() throws {
        let snapshot = WindowSnapshot(
            filePath: "/tmp/continuum-window.png",
            windowTitle: "Preview paper",
            retainRawImage: false,
            metadata: ["fixture": .bool(true)]
        )
        let ocr = FixtureOcrService(text: "Continuum OCR fixture")
        let result = try ocr.recognizeText(in: snapshot)
        let event = result.toNativeCaptureEvent(sessionId: "session_1")

        try expect(event.artifacts.contains { $0.artifactType == "ocr_text" }, "OCR text should become ocr_text")
        try expect(event.artifacts.first?.content == "Continuum OCR fixture", "OCR text should be preserved as derived text")
        try expect(event.artifacts.first?.filePath == nil, "Raw screenshot path should not be retained by default")
        try expect(event.source?.permissionState == "granted", "OCR fixture source should be permission-granted")
    }

    private static func ocrPipelineDeletesTemporarySnapshotByDefault() throws {
        let tempUrl = FileManager.default.temporaryDirectory.appendingPathComponent("continuum-ocr-test-\(UUID().uuidString).png")
        try Data("pixels".utf8).write(to: tempUrl)
        let pipeline = OcrPipeline(
            snapshotter: FixtureWindowSnapshotter(
                snapshot: WindowSnapshot(filePath: tempUrl.path, windowTitle: "Fixture", retainRawImage: false)
            ),
            ocr: FixtureOcrService(text: "Temporary OCR text")
        )

        let event = try pipeline.captureFrontmostWindowText(sessionId: "session_1", retainRawImage: false)

        try expect(event?.artifacts.first?.content == "Temporary OCR text", "OCR pipeline should return derived text")
        try expect(!FileManager.default.fileExists(atPath: tempUrl.path), "OCR pipeline should delete temporary raw image by default")
    }

    private static func mediaSampleMapsToSystemAudioMetadata() throws {
        let sampler = FixtureMediaAppSampler(
            sample: MediaPlaybackSample(
                appName: "Music",
                bundleId: "com.apple.Music",
                trackTitle: "Continuum Architecture Notes",
                artist: "Local Podcast",
                album: "Capture Sessions",
                currentTime: 42,
                duration: 600,
                windowTitle: "Continuum Architecture Notes",
                permissionState: "granted",
                metadata: ["fixture": .bool(true)]
            )
        )

        let event = try sampler.sampleActiveMediaApp()?.toNativeCaptureEvent(sessionId: "session_1")

        try expect(event?.source?.sourceType == "system_audio", "Media source should be system_audio")
        try expect(event?.artifacts.first?.artifactType == "system_audio_metadata", "Media metadata should become system_audio_metadata")
        try expect(event?.artifacts.first?.timestampStart == 42, "Media timestamp should be preserved")
    }

    private static func captureLoopPostsAccessibilityAndMediaEvidence() throws {
        let poster = CollectingNativeCapturePoster()
        let loop = NativeCaptureLoop(
            accessibility: FixtureAccessibilitySampler(
                sample: AccessibilitySample(appName: "Preview", selectedText: "Native note", permissionState: "granted")
            ),
            media: FixtureMediaAppSampler(
                sample: MediaPlaybackSample(appName: "Music", trackTitle: "Capture talk", currentTime: 10, permissionState: "granted")
            ),
            poster: poster
        )

        let posted = try loop.captureOnce(sessionId: "session_1")

        try expect(posted == 2, "Capture loop should post accessibility and media evidence")
        try expect(poster.events.allSatisfy { $0.sessionId == "session_1" }, "Capture loop should attach active session id")
    }
}

struct TestFailure: Error, CustomStringConvertible {
    let description: String

    init(_ description: String) {
        self.description = description
    }
}
