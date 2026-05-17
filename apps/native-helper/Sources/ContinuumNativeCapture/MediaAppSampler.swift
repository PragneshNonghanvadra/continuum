import AppKit
import Foundation

public struct MediaPlaybackSample: Equatable, Sendable {
    public let appName: String
    public let bundleId: String?
    public let trackTitle: String?
    public let artist: String?
    public let album: String?
    public let currentTime: Double?
    public let duration: Double?
    public let windowTitle: String?
    public let permissionState: String
    public let metadata: [String: JSONValue]

    public init(
        appName: String,
        bundleId: String? = nil,
        trackTitle: String? = nil,
        artist: String? = nil,
        album: String? = nil,
        currentTime: Double? = nil,
        duration: Double? = nil,
        windowTitle: String? = nil,
        permissionState: String = "unknown",
        metadata: [String: JSONValue] = [:]
    ) {
        self.appName = appName
        self.bundleId = bundleId
        self.trackTitle = trackTitle
        self.artist = artist
        self.album = album
        self.currentTime = currentTime
        self.duration = duration
        self.windowTitle = windowTitle
        self.permissionState = permissionState
        self.metadata = metadata
    }

    public func toNativeCaptureEvent(sessionId: String? = nil, occurredAt: String = ISO8601DateFormatter().string(from: Date())) -> NativeCaptureEvent {
        let artifactMetadata = metadata.merging([
            "album": album.map(JSONValue.string) ?? .null,
            "appName": .string(appName),
            "artist": artist.map(JSONValue.string) ?? .null,
            "duration": duration.map(JSONValue.number) ?? .null,
            "trackTitle": trackTitle.map(JSONValue.string) ?? .null
        ]) { current, _ in current }

        return NativeCaptureEvent(
            sessionId: sessionId,
            source: CaptureSourceInput(
                sourceType: "system_audio",
                appName: appName,
                bundleId: bundleId,
                windowTitle: windowTitle,
                captureCapabilities: ["system_audio_metadata", "transcript"],
                permissionState: permissionState,
                metadata: metadata
            ),
            artifacts: [
                ArtifactInput(
                    artifactType: "system_audio_metadata",
                    timestampStart: currentTime,
                    timestampEnd: duration,
                    metadata: artifactMetadata
                )
            ],
            occurredAt: occurredAt
        )
    }
}

public protocol MediaAppSampling {
    func sampleActiveMediaApp() throws -> MediaPlaybackSample?
}

public struct FixtureMediaAppSampler: MediaAppSampling {
    private let sample: MediaPlaybackSample?

    public init(sample: MediaPlaybackSample?) {
        self.sample = sample
    }

    public func sampleActiveMediaApp() throws -> MediaPlaybackSample? {
        sample
    }
}

public struct MacMediaAppSampler: MediaAppSampling {
    public init() {}

    public func sampleActiveMediaApp() throws -> MediaPlaybackSample? {
        guard let app = NSWorkspace.shared.frontmostApplication else {
            return nil
        }
        let appName = app.localizedName ?? app.bundleIdentifier ?? "Unknown"
        let bundleId = app.bundleIdentifier

        if bundleId == "com.apple.Music" || appName == "Music" {
            return musicSample(appName: appName, bundleId: bundleId)
        }
        if bundleId == "com.apple.podcasts" || appName == "Podcasts" {
            return podcastsSample(appName: appName, bundleId: bundleId)
        }

        return MediaPlaybackSample(
            appName: appName,
            bundleId: bundleId,
            windowTitle: app.localizedName,
            permissionState: "unknown",
            metadata: ["fallback": .string("frontmost_app_metadata")]
        )
    }

    private func musicSample(appName: String, bundleId: String?) -> MediaPlaybackSample {
        let title = appleScriptString("tell application \"Music\" to if player state is playing then name of current track")
        let artist = appleScriptString("tell application \"Music\" to if player state is playing then artist of current track")
        let album = appleScriptString("tell application \"Music\" to if player state is playing then album of current track")
        let currentTime = appleScriptDouble("tell application \"Music\" to if player state is playing then player position")
        let duration = appleScriptDouble("tell application \"Music\" to if player state is playing then duration of current track")

        return MediaPlaybackSample(
            appName: appName,
            bundleId: bundleId,
            trackTitle: title,
            artist: artist,
            album: album,
            currentTime: currentTime,
            duration: duration,
            windowTitle: title,
            permissionState: title == nil ? "prompt_required" : "granted",
            metadata: ["adapter": .string("music_applescript")]
        )
    }

    private func podcastsSample(appName: String, bundleId: String?) -> MediaPlaybackSample {
        MediaPlaybackSample(
            appName: appName,
            bundleId: bundleId,
            windowTitle: appName,
            permissionState: "unknown",
            metadata: ["adapter": .string("podcasts_frontmost")]
        )
    }
}

private func appleScriptString(_ source: String) -> String? {
    var error: NSDictionary?
    guard let script = NSAppleScript(source: source) else {
        return nil
    }
    let output = script.executeAndReturnError(&error)
    guard error == nil else {
        return nil
    }
    let value = output.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines)
    return value?.isEmpty == false ? value : nil
}

private func appleScriptDouble(_ source: String) -> Double? {
    var error: NSDictionary?
    guard let script = NSAppleScript(source: source) else {
        return nil
    }
    let output = script.executeAndReturnError(&error)
    guard error == nil else {
        return nil
    }
    return output.doubleValue
}
