import ContinuumNativeCapture
import Foundation

@main
struct ContinuumNativeCaptureModelTests {
    static func main() throws {
        try nativeCaptureEventEncodesContinuumApiShape()
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
}

struct TestFailure: Error, CustomStringConvertible {
    let description: String

    init(_ description: String) {
        self.description = description
    }
}
