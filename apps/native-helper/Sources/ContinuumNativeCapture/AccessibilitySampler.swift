import AppKit
import ApplicationServices
import Foundation

public struct AccessibilitySample: Equatable, Sendable {
    public let appName: String
    public let bundleId: String?
    public let windowTitle: String?
    public let selectedText: String?
    public let documentText: String?
    public let sourceUrl: String?
    public let filePath: String?
    public let permissionState: String
    public let metadata: [String: JSONValue]

    public init(
        appName: String,
        bundleId: String? = nil,
        windowTitle: String? = nil,
        selectedText: String? = nil,
        documentText: String? = nil,
        sourceUrl: String? = nil,
        filePath: String? = nil,
        permissionState: String = "unknown",
        metadata: [String: JSONValue] = [:]
    ) {
        self.appName = appName
        self.bundleId = bundleId
        self.windowTitle = windowTitle
        self.selectedText = selectedText
        self.documentText = documentText
        self.sourceUrl = sourceUrl
        self.filePath = filePath
        self.permissionState = permissionState
        self.metadata = metadata
    }

    public func toNativeCaptureEvent(sessionId: String? = nil, occurredAt: String = ISO8601DateFormatter().string(from: Date())) -> NativeCaptureEvent {
        var artifacts: [ArtifactInput] = []
        if let selectedText, !selectedText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            artifacts.append(
                ArtifactInput(
                    artifactType: "native_app_text",
                    content: selectedText,
                    metadata: ["source": .string("accessibility_selected_text")]
                )
            )
        }
        if let documentText, !documentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            artifacts.append(
                ArtifactInput(
                    artifactType: "document_text",
                    content: documentText,
                    metadata: ["source": .string("accessibility_document_text")]
                )
            )
        }

        return NativeCaptureEvent(
            sessionId: sessionId,
            source: CaptureSourceInput(
                sourceType: "macos_app",
                appName: appName,
                bundleId: bundleId,
                windowTitle: windowTitle,
                sourceUrl: sourceUrl,
                filePath: filePath,
                captureCapabilities: ["native_app_text", "document_text", "ocr_text"],
                permissionState: permissionState,
                metadata: metadata
            ),
            artifacts: artifacts,
            occurredAt: occurredAt
        )
    }
}

public protocol AccessibilitySampling {
    func sampleFrontmostApplication() throws -> AccessibilitySample
}

public struct FixtureAccessibilitySampler: AccessibilitySampling {
    private let sample: AccessibilitySample

    public init(sample: AccessibilitySample) {
        self.sample = sample
    }

    public func sampleFrontmostApplication() throws -> AccessibilitySample {
        sample
    }
}

public struct MacAccessibilitySampler: AccessibilitySampling {
    public init() {}

    public func sampleFrontmostApplication() throws -> AccessibilitySample {
        guard let app = NSWorkspace.shared.frontmostApplication else {
            return AccessibilitySample(appName: "Unknown", permissionState: "unknown")
        }

        let appName = app.localizedName ?? app.bundleIdentifier ?? "Unknown"
        let bundleId = app.bundleIdentifier
        let trusted = AXIsProcessTrusted()
        if !trusted {
            return AccessibilitySample(
                appName: appName,
                bundleId: bundleId,
                permissionState: "prompt_required",
                metadata: ["accessibilityTrusted": .bool(false)]
            )
        }

        let appElement = AXUIElementCreateApplication(app.processIdentifier)
        let focusedWindow: AXUIElement? = copyAttribute(appElement, kAXFocusedWindowAttribute)
        let focusedElement: AXUIElement? = copyAttribute(appElement, kAXFocusedUIElementAttribute)
        let windowTitle: String? = focusedWindow.flatMap { copyAttribute($0, kAXTitleAttribute) }
        let selectedText: String? = focusedElement.flatMap { copyAttribute($0, kAXSelectedTextAttribute) }
        let documentText: String? = focusedElement.flatMap { copyAttribute($0, kAXValueAttribute) }
        let documentUrl: String? = focusedWindow.flatMap { copyAttribute($0, kAXDocumentAttribute) }
        let filePath = documentUrl.flatMap { URL(string: $0)?.path }

        return AccessibilitySample(
            appName: appName,
            bundleId: bundleId,
            windowTitle: windowTitle,
            selectedText: selectedText,
            documentText: documentText,
            sourceUrl: documentUrl?.hasPrefix("http") == true ? documentUrl : nil,
            filePath: filePath,
            permissionState: "granted",
            metadata: ["accessibilityTrusted": .bool(true)]
        )
    }
}

private func copyAttribute<T>(_ element: AXUIElement, _ attribute: String) -> T? {
    var value: CFTypeRef?
    let error = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
    guard error == .success else {
        return nil
    }
    return value as? T
}
