import ContinuumNativeCapture
import Foundation

@main
struct ContinuumNativeCaptureModelTests {
    static func main() throws {
        try nativeCaptureEventEncodesContinuumApiShape()
        try accessibilitySampleMapsToNativeArtifacts()
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
}

struct TestFailure: Error, CustomStringConvertible {
    let description: String

    init(_ description: String) {
        self.description = description
    }
}
