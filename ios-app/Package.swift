// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BayitPlus",
    platforms: [
        .iOS(.v17),
        .tvOS(.v17)
    ],
    products: [
        .library(name: "BayitCore", targets: ["BayitCore"]),
        .library(name: "BayitNetworking", targets: ["BayitNetworking"]),
        .library(name: "BayitAuth", targets: ["BayitAuth"]),
        .library(name: "BayitLocalization", targets: ["BayitLocalization"]),
        .library(name: "BayitDesignSystem", targets: ["BayitDesignSystem"]),
        .library(name: "BayitMedia", targets: ["BayitMedia"]),
        .library(name: "BayitVoice", targets: ["BayitVoice"]),
        .library(name: "BayitPersistence", targets: ["BayitPersistence"]),
        .library(name: "BayitAnalytics", targets: ["BayitAnalytics"]),
    ],
    dependencies: [
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "11.0.0"),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "8.0.0"),
    ],
    targets: [
        // MARK: - BayitCore
        .target(
            name: "BayitCore",
            path: "Packages/BayitCore/Sources/BayitCore"
        ),

        // MARK: - BayitNetworking
        .target(
            name: "BayitNetworking",
            dependencies: ["BayitCore"],
            path: "Packages/BayitNetworking/Sources/BayitNetworking"
        ),

        // MARK: - BayitAuth
        .target(
            name: "BayitAuth",
            dependencies: [
                "BayitCore",
                "BayitNetworking",
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(
                    name: "GoogleSignIn",
                    package: "GoogleSignIn-iOS",
                    condition: .when(platforms: [.iOS])
                ),
            ],
            path: "Packages/BayitAuth/Sources/BayitAuth"
        ),

        // MARK: - BayitLocalization
        .target(
            name: "BayitLocalization",
            dependencies: ["BayitCore"],
            path: "Packages/BayitLocalization/Sources",
            resources: [.process("Resources")]
        ),

        // MARK: - BayitDesignSystem
        .target(
            name: "BayitDesignSystem",
            dependencies: ["BayitCore"],
            path: "Packages/BayitDesignSystem/Sources/BayitDesignSystem"
        ),

        // MARK: - BayitMedia
        .target(
            name: "BayitMedia",
            dependencies: ["BayitCore", "BayitNetworking"],
            path: "Packages/BayitMedia/Sources/BayitMedia"
        ),

        // MARK: - BayitVoice
        .target(
            name: "BayitVoice",
            dependencies: ["BayitCore", "BayitNetworking"],
            path: "Packages/BayitVoice/Sources/BayitVoice"
        ),

        // MARK: - BayitPersistence
        .target(
            name: "BayitPersistence",
            dependencies: ["BayitCore"],
            path: "Packages/BayitPersistence/Sources/BayitPersistence"
        ),

        // MARK: - BayitAnalytics
        .target(
            name: "BayitAnalytics",
            dependencies: ["BayitCore"],
            path: "Packages/BayitAnalytics/Sources/BayitAnalytics"
        ),

        // MARK: - Tests

        .testTarget(
            name: "BayitCoreTests",
            dependencies: ["BayitCore"],
            path: "Packages/BayitCore/Tests/BayitCoreTests"
        ),

        .testTarget(
            name: "BayitNetworkingTests",
            dependencies: ["BayitNetworking", "BayitCore"],
            path: "Packages/BayitNetworking/Tests/BayitNetworkingTests"
        ),

        .testTarget(
            name: "BayitAuthTests",
            dependencies: ["BayitAuth", "BayitCore", "BayitNetworking"],
            path: "Packages/BayitAuth/Tests/BayitAuthTests"
        ),

        .testTarget(
            name: "BayitDesignSystemTests",
            dependencies: ["BayitDesignSystem", "BayitCore"],
            path: "Packages/BayitDesignSystem/Tests/BayitDesignSystemTests"
        ),

        .testTarget(
            name: "BayitVoiceTests",
            dependencies: ["BayitVoice", "BayitCore", "BayitNetworking"],
            path: "Packages/BayitVoice/Tests/BayitVoiceTests"
        ),

        .testTarget(
            name: "BayitMediaTests",
            dependencies: ["BayitMedia", "BayitCore", "BayitNetworking"],
            path: "Packages/BayitMedia/Tests/BayitMediaTests"
        ),
    ]
)
