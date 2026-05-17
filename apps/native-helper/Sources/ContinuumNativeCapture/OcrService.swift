import Foundation
import Vision

public struct WindowSnapshot: Equatable, Sendable {
    public let filePath: String
    public let windowTitle: String?
    public let retainRawImage: Bool
    public let metadata: [String: JSONValue]

    public init(
        filePath: String,
        windowTitle: String? = nil,
        retainRawImage: Bool = false,
        metadata: [String: JSONValue] = [:]
    ) {
        self.filePath = filePath
        self.windowTitle = windowTitle
        self.retainRawImage = retainRawImage
        self.metadata = metadata
    }
}

public struct OcrCaptureResult: Equatable, Sendable {
    public let text: String
    public let snapshot: WindowSnapshot
    public let confidence: Double?

    public init(text: String, snapshot: WindowSnapshot, confidence: Double? = nil) {
        self.text = text
        self.snapshot = snapshot
        self.confidence = confidence
    }

    public func toNativeCaptureEvent(sessionId: String? = nil, occurredAt: String = ISO8601DateFormatter().string(from: Date())) -> NativeCaptureEvent {
        NativeCaptureEvent(
            sessionId: sessionId,
            source: CaptureSourceInput(
                sourceType: "screen_window",
                appName: nil,
                bundleId: nil,
                windowTitle: snapshot.windowTitle,
                sourceUrl: nil,
                filePath: snapshot.retainRawImage ? snapshot.filePath : nil,
                captureCapabilities: ["ocr_text", "native_window_snapshot"],
                permissionState: "granted",
                metadata: snapshot.metadata.merging(["rawImageRetained": .bool(snapshot.retainRawImage)]) { current, _ in current }
            ),
            artifacts: [
                ArtifactInput(
                    artifactType: "ocr_text",
                    content: text,
                    filePath: snapshot.retainRawImage ? snapshot.filePath : nil,
                    metadata: [
                        "confidence": confidence.map(JSONValue.number) ?? .null,
                        "rawImageRetained": .bool(snapshot.retainRawImage),
                        "source": .string("vision_ocr")
                    ]
                )
            ],
            occurredAt: occurredAt
        )
    }
}

public protocol OcrRecognizing {
    func recognizeText(in snapshot: WindowSnapshot) throws -> OcrCaptureResult
}

public struct FixtureOcrService: OcrRecognizing {
    private let text: String

    public init(text: String) {
        self.text = text
    }

    public func recognizeText(in snapshot: WindowSnapshot) throws -> OcrCaptureResult {
        OcrCaptureResult(text: text, snapshot: snapshot, confidence: 1)
    }
}

public struct VisionOcrService: OcrRecognizing {
    public init() {}

    public func recognizeText(in snapshot: WindowSnapshot) throws -> OcrCaptureResult {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(url: URL(fileURLWithPath: snapshot.filePath))
        try handler.perform([request])

        let observations = request.results ?? []
        let lines = observations.compactMap { $0.topCandidates(1).first }
        let text = lines.map(\.string).joined(separator: "\n")
        let confidence = lines.isEmpty ? nil : Double(lines.map(\.confidence).reduce(0, +)) / Double(lines.count)

        return OcrCaptureResult(text: text, snapshot: snapshot, confidence: confidence)
    }
}

public struct OcrPipeline {
    private let snapshotter: WindowSnapshotting
    private let ocr: OcrRecognizing

    public init(snapshotter: WindowSnapshotting = ActiveWindowSnapshotter(), ocr: OcrRecognizing = VisionOcrService()) {
        self.snapshotter = snapshotter
        self.ocr = ocr
    }

    public func captureFrontmostWindowText(sessionId: String? = nil, retainRawImage: Bool = false) throws -> NativeCaptureEvent? {
        guard let snapshot = try snapshotter.captureFrontmostWindow(retainRawImage: retainRawImage) else {
            return nil
        }
        defer {
            if !retainRawImage {
                try? FileManager.default.removeItem(atPath: snapshot.filePath)
            }
        }
        let result = try ocr.recognizeText(in: snapshot)
        return result.toNativeCaptureEvent(sessionId: sessionId)
    }
}
