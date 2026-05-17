import ContinuumNativeCapture
import Foundation

@main
struct ContinuumNativeCaptureCommand {
    static func main() throws {
        let command = CommandLine.arguments.dropFirst().first ?? "help"
        switch command {
        case "accessibility-sample":
            let event = try MacAccessibilitySampler().sampleFrontmostApplication().toNativeCaptureEvent()
            try printJson(event)
        case "capabilities":
            try printJson(nativeCaptureCapabilities)
        case "media-sample":
            if let event = try MacMediaAppSampler().sampleActiveMediaApp()?.toNativeCaptureEvent() {
                try printJson(event)
            } else {
                try printJson(NativeCaptureEvent(sessionId: nil, source: nil, artifacts: [], occurredAt: ISO8601DateFormatter().string(from: Date())))
            }
        case "ocr-window":
            if let event = try OcrPipeline().captureFrontmostWindowText(retainRawImage: false) {
                try printJson(event)
            } else {
                try printJson(NativeCaptureEvent(sessionId: nil, source: nil, artifacts: [], occurredAt: ISO8601DateFormatter().string(from: Date())))
            }
        case "sample":
            try printJson(sampleEvent())
        default:
            print("usage: continuum-native-capture accessibility-sample|capabilities|media-sample|ocr-window|sample")
        }
    }

    private static func printJson<T: Encodable>(_ value: T) throws {
        let data = try JSONEncoder.continuum.encode(value)
        print(String(decoding: data, as: UTF8.self))
    }

    private static func sampleEvent() -> NativeCaptureEvent {
        NativeCaptureEvent(
            sessionId: nil,
            source: CaptureSourceInput(
                sourceType: "macos_app",
                appName: "Continuum Fixture",
                bundleId: "app.continuum.fixture",
                windowTitle: "Native capture fixture",
                captureCapabilities: ["native_app_text"],
                permissionState: "not_required",
                metadata: ["fixture": .bool(true)]
            ),
            artifacts: [
                ArtifactInput(
                    artifactType: "native_app_text",
                    content: "Continuum native capture fixture text.",
                    metadata: ["source": .string("fixture")]
                )
            ],
            occurredAt: ISO8601DateFormatter().string(from: Date())
        )
    }
}
