// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "ContinuumNativeCapture",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "ContinuumNativeCapture", targets: ["ContinuumNativeCapture"]),
        .executable(name: "continuum-native-capture", targets: ["ContinuumNativeCaptureCLI"]),
        .executable(name: "continuum-native-capture-model-tests", targets: ["ContinuumNativeCaptureModelTests"])
    ],
    targets: [
        .target(name: "ContinuumNativeCapture"),
        .executableTarget(
            name: "ContinuumNativeCaptureCLI",
            dependencies: ["ContinuumNativeCapture"]
        ),
        .executableTarget(
            name: "ContinuumNativeCaptureModelTests",
            dependencies: ["ContinuumNativeCapture"]
        )
    ]
)
