import Foundation

public enum JSONValue: Codable, Equatable, Sendable {
    case array([JSONValue])
    case bool(Bool)
    case null
    case number(Double)
    case object([String: JSONValue])
    case string(String)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .array(let values):
            try container.encode(values)
        case .bool(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        case .number(let value):
            try container.encode(value)
        case .object(let value):
            try container.encode(value)
        case .string(let value):
            try container.encode(value)
        }
    }
}

public struct CaptureSourceInput: Codable, Equatable, Sendable {
    public let sourceType: String
    public let appName: String?
    public let bundleId: String?
    public let windowTitle: String?
    public let sourceUrl: String?
    public let filePath: String?
    public let captureCapabilities: [String]
    public let permissionState: String
    public let metadata: [String: JSONValue]

    public init(
        sourceType: String,
        appName: String? = nil,
        bundleId: String? = nil,
        windowTitle: String? = nil,
        sourceUrl: String? = nil,
        filePath: String? = nil,
        captureCapabilities: [String] = [],
        permissionState: String = "unknown",
        metadata: [String: JSONValue] = [:]
    ) {
        self.sourceType = sourceType
        self.appName = appName
        self.bundleId = bundleId
        self.windowTitle = windowTitle
        self.sourceUrl = sourceUrl
        self.filePath = filePath
        self.captureCapabilities = captureCapabilities
        self.permissionState = permissionState
        self.metadata = metadata
    }
}

public struct ArtifactInput: Codable, Equatable, Sendable {
    public let artifactType: String
    public let content: String?
    public let filePath: String?
    public let timestampStart: Double?
    public let timestampEnd: Double?
    public let metadata: [String: JSONValue]

    public init(
        artifactType: String,
        content: String? = nil,
        filePath: String? = nil,
        timestampStart: Double? = nil,
        timestampEnd: Double? = nil,
        metadata: [String: JSONValue] = [:]
    ) {
        self.artifactType = artifactType
        self.content = content
        self.filePath = filePath
        self.timestampStart = timestampStart
        self.timestampEnd = timestampEnd
        self.metadata = metadata
    }
}

public struct NativeCaptureEvent: Codable, Equatable, Sendable {
    public let sessionId: String?
    public let source: CaptureSourceInput?
    public let artifacts: [ArtifactInput]
    public let occurredAt: String?

    public init(
        sessionId: String? = nil,
        source: CaptureSourceInput? = nil,
        artifacts: [ArtifactInput],
        occurredAt: String? = nil
    ) {
        self.sessionId = sessionId
        self.source = source
        self.artifacts = artifacts
        self.occurredAt = occurredAt
    }
}

public struct CaptureCapability: Codable, Equatable, Sendable {
    public let sourceType: String
    public let artifactTypes: [String]
    public let permissionNotes: String

    public init(sourceType: String, artifactTypes: [String], permissionNotes: String) {
        self.sourceType = sourceType
        self.artifactTypes = artifactTypes
        self.permissionNotes = permissionNotes
    }
}

public extension JSONEncoder {
    static var continuum: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return encoder
    }
}

public let nativeCaptureCapabilities: [CaptureCapability] = [
    CaptureCapability(
        sourceType: "macos_app",
        artifactTypes: ["native_app_text", "document_text", "ocr_text", "native_window_snapshot"],
        permissionNotes: "Accessibility and Screen Recording permissions may be required for selected text and OCR."
    ),
    CaptureCapability(
        sourceType: "system_audio",
        artifactTypes: ["system_audio_metadata", "transcript"],
        permissionNotes: "Audio is not retained by default; transcripts require a configured provider."
    ),
    CaptureCapability(
        sourceType: "file_document",
        artifactTypes: ["document_text", "ocr_text"],
        permissionNotes: "Downloaded documents are sampled only during an explicit active session."
    )
]
