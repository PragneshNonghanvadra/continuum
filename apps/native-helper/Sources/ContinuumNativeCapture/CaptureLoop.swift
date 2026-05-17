import Foundation

public final class NativeCaptureLoop {
    private let accessibility: AccessibilitySampling
    private let media: MediaAppSampling
    private let ocr: OcrPipeline?
    private let poster: NativeCapturePosting

    public init(
        accessibility: AccessibilitySampling = MacAccessibilitySampler(),
        media: MediaAppSampling = MacMediaAppSampler(),
        ocr: OcrPipeline? = nil,
        poster: NativeCapturePosting
    ) {
        self.accessibility = accessibility
        self.media = media
        self.ocr = ocr
        self.poster = poster
    }

    public func captureOnce(sessionId: String) throws -> Int {
        var posted = 0

        let accessibilityEvent = try accessibility.sampleFrontmostApplication().toNativeCaptureEvent(sessionId: sessionId)
        if accessibilityEvent.source != nil || !accessibilityEvent.artifacts.isEmpty {
            try poster.post(event: accessibilityEvent)
            posted += 1
        }

        if let mediaEvent = try media.sampleActiveMediaApp()?.toNativeCaptureEvent(sessionId: sessionId) {
            try poster.post(event: mediaEvent)
            posted += 1
        }

        if let ocrEvent = try ocr?.captureFrontmostWindowText(sessionId: sessionId, retainRawImage: false) {
            try poster.post(event: ocrEvent)
            posted += 1
        }

        return posted
    }

    public func run(sessionId: String, intervalSeconds: TimeInterval = 5) throws -> Never {
        while true {
            _ = try captureOnce(sessionId: sessionId)
            Thread.sleep(forTimeInterval: intervalSeconds)
        }
    }
}

public final class CollectingNativeCapturePoster: NativeCapturePosting {
    public private(set) var events: [NativeCaptureEvent] = []

    public init() {}

    public func post(event: NativeCaptureEvent) throws {
        events.append(event)
    }
}
