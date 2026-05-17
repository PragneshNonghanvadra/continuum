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
        case "run":
            let options = parseOptions()
            guard let sessionId = options["session-id"], let apiBaseUrl = options["api-base-url"].flatMap(URL.init(string:)) else {
                throw NativeCaptureError("run requires --session-id and --api-base-url")
            }
            let interval = options["interval"].flatMap(TimeInterval.init) ?? 5
            let client = ContinuumApiClient(apiBaseUrl: apiBaseUrl)
            try NativeCaptureLoop(ocr: nil, poster: client).run(sessionId: sessionId, intervalSeconds: interval)
        case "run-once":
            let options = parseOptions()
            guard let sessionId = options["session-id"], let apiBaseUrl = options["api-base-url"].flatMap(URL.init(string:)) else {
                throw NativeCaptureError("run-once requires --session-id and --api-base-url")
            }
            let client = ContinuumApiClient(apiBaseUrl: apiBaseUrl)
            let posted = try NativeCaptureLoop(ocr: nil, poster: client).captureOnce(sessionId: sessionId)
            try printJson(["posted": posted])
        case "sample":
            try printJson(sampleEvent())
        default:
            print("usage: continuum-native-capture accessibility-sample|capabilities|media-sample|ocr-window|run|run-once|sample")
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

    private static func parseOptions() -> [String: String] {
        let args = Array(CommandLine.arguments.dropFirst(2))
        var options: [String: String] = [:]
        var index = 0
        while index < args.count {
            let key = args[index]
            if key.hasPrefix("--"), index + 1 < args.count {
                options[String(key.dropFirst(2))] = args[index + 1]
                index += 2
            } else {
                index += 1
            }
        }
        return options
    }
}
