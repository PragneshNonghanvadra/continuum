import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

public protocol WindowSnapshotting {
    func captureFrontmostWindow(retainRawImage: Bool) throws -> WindowSnapshot?
}

public struct FixtureWindowSnapshotter: WindowSnapshotting {
    private let snapshot: WindowSnapshot?

    public init(snapshot: WindowSnapshot?) {
        self.snapshot = snapshot
    }

    public func captureFrontmostWindow(retainRawImage: Bool) throws -> WindowSnapshot? {
        guard let snapshot else {
            return nil
        }
        return WindowSnapshot(
            filePath: snapshot.filePath,
            windowTitle: snapshot.windowTitle,
            retainRawImage: retainRawImage,
            metadata: snapshot.metadata
        )
    }
}

public struct ActiveWindowSnapshotter: WindowSnapshotting {
    private let outputDirectory: URL

    public init(outputDirectory: URL = FileManager.default.temporaryDirectory) {
        self.outputDirectory = outputDirectory
    }

    public func captureFrontmostWindow(retainRawImage: Bool = false) throws -> WindowSnapshot? {
        guard let image = CGWindowListCreateImage(.null, [.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID, [.bestResolution]) else {
            return nil
        }

        let outputUrl = outputDirectory.appendingPathComponent("continuum-window-\(UUID().uuidString).png")
        guard let destination = CGImageDestinationCreateWithURL(outputUrl as CFURL, UTType.png.identifier as CFString, 1, nil) else {
            throw NativeCaptureError("Unable to create window snapshot destination.")
        }
        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else {
            throw NativeCaptureError("Unable to write window snapshot.")
        }

        if !retainRawImage {
            // The OCR pipeline reads the temporary file and then removes it after derived text is posted.
            // The path is kept in-memory only so raw pixels are not retained as Continuum artifacts.
        }

        return WindowSnapshot(
            filePath: outputUrl.path,
            retainRawImage: retainRawImage,
            metadata: ["captureMethod": .string("cg_window_list")]
        )
    }
}

public struct NativeCaptureError: Error, CustomStringConvertible, Sendable {
    public let description: String

    public init(_ description: String) {
        self.description = description
    }
}
