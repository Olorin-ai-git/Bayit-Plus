// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BayitPlus",
    platforms: [
        .iOS(.v17)
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
        .testTarget(
            name: "BayitCoreTests",
            dependencies: ["BayitCore"],
            path: "Packages/BayitCore/Tests/BayitCoreTests"
        ),

        // MARK: - BayitNetworking
        .target(
            name: "BayitNetworking",
            dependencies: ["BayitCore"],
            path: "Packages/BayitNetworking/Sources/BayitNetworking"
        ),
        .testTarget(
            name: "BayitNetworkingTests",
            dependencies: ["BayitNetworking"],
            path: "Packages/BayitNetworking/Tests/BayitNetworkingTests"
        ),

        // MARK: - BayitAuth
        .target(
            name: "BayitAuth",
            dependencies: [
                "BayitCore",
                "BayitNetworking",
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS"),
            ],
            path: "Packages/BayitAuth/Sources/BayitAuth"
        ),
        .testTarget(
            name: "BayitAuthTests",
            dependencies: ["BayitAuth"],
            path: "Packages/BayitAuth/Tests/BayitAuthTests"
        ),

        // MARK: - BayitLocalization
        .target(
            name: "BayitLocalization",
            dependencies: ["BayitCore"],
            path: "Packages/BayitLocalization/Sources",
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "BayitLocalizationTests",
            dependencies: ["BayitLocalization"],
            path: "Packages/BayitLocalization/Tests/BayitLocalizationTests"
        ),

        // MARK: - BayitDesignSystem
        .target(
            name: "BayitDesignSystem",
            dependencies: ["BayitCore"],
            path: "Packages/BayitDesignSystem/Sources/BayitDesignSystem"
        ),
        .testTarget(
            name: "BayitDesignSystemTests",
            dependencies: ["BayitDesignSystem"],
            path: "Packages/BayitDesignSystem/Tests/BayitDesignSystemTests"
        ),

        // MARK: - BayitMedia
        .target(
            name: "BayitMedia",
            dependencies: ["BayitCore", "BayitNetworking"],
            path: "Packages/BayitMedia/Sources/BayitMedia"
        ),
        .testTarget(
            name: "BayitMediaTests",
            dependencies: ["BayitMedia"],
            path: "Packages/BayitMedia/Tests/BayitMediaTests"
        ),

        // MARK: - BayitVoice
        .target(
            name: "BayitVoice",
            dependencies: ["BayitCore", "BayitNetworking"],
            path: "Packages/BayitVoice/Sources/BayitVoice"
        ),
        .testTarget(
            name: "BayitVoiceTests",
            dependencies: ["BayitVoice"],
            path: "Packages/BayitVoice/Tests/BayitVoiceTests"
        ),

        // MARK: - BayitPersistence
        .target(
            name: "BayitPersistence",
            dependencies: ["BayitCore"],
            path: "Packages/BayitPersistence/Sources/BayitPersistence"
        ),
        .testTarget(
            name: "BayitPersistenceTests",
            dependencies: ["BayitPersistence"],
            path: "Packages/BayitPersistence/Tests/BayitPersistenceTests"
        ),

        // MARK: - BayitAnalytics
        .target(
            name: "BayitAnalytics",
            dependencies: ["BayitCore"],
            path: "Packages/BayitAnalytics/Sources/BayitAnalytics"
        ),
        .testTarget(
            name: "BayitAnalyticsTests",
            dependencies: ["BayitAnalytics"],
            path: "Packages/BayitAnalytics/Tests/BayitAnalyticsTests"
        ),
    ]
)
