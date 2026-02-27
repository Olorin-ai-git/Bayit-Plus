// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BayitPlus",
    platforms: [
        .iOS(.v17),
        .tvOS(.v17),
        .macOS(.v14),
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
        .library(name: "BayitWidgetShared", targets: ["BayitWidgetShared"]),
        .library(name: "BayitNotifications", targets: ["BayitNotifications"]),
        .library(name: "BayitCast", targets: ["BayitCast"]),
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
                    condition: .when(platforms: [.iOS, .macOS])
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
            dependencies: [
                "BayitCore",
                "BayitNetworking",
            ],
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
            dependencies: [
                "BayitCore",
                .product(
                    name: "FirebaseAnalytics",
                    package: "firebase-ios-sdk",
                    condition: .when(platforms: [.iOS, .tvOS])
                ),
                .product(
                    name: "FirebaseCrashlytics",
                    package: "firebase-ios-sdk",
                    condition: .when(platforms: [.iOS, .tvOS])
                ),
            ],
            path: "Packages/BayitAnalytics/Sources/BayitAnalytics"
        ),

        // MARK: - BayitWidgetShared

        .target(
            name: "BayitWidgetShared",
            dependencies: ["BayitCore"],
            path: "Packages/BayitWidgetShared/Sources/BayitWidgetShared"
        ),

        // MARK: - BayitNotifications

        .target(
            name: "BayitNotifications",
            dependencies: [
                "BayitCore",
                "BayitNetworking",
                .product(
                    name: "FirebaseMessaging",
                    package: "firebase-ios-sdk",
                    condition: .when(platforms: [.iOS])
                ),
            ],
            path: "Packages/BayitNotifications/Sources/BayitNotifications"
        ),

        // MARK: - BayitCast

        .target(
            name: "BayitCast",
            dependencies: [
                "BayitCore",
                "BayitMedia",
                .target(name: "GoogleCast", condition: .when(platforms: [.iOS])),
            ],
            path: "Packages/BayitCast/Sources/BayitCast"
        ),

        // MARK: - GoogleCast (dynamic XCFramework, iOS only)

        // Source: SRGSSR community wrapper of official Google Cast SDK binaries
        // SDK version: 4.8.4 | Minimum iOS: 15
        .binaryTarget(
            name: "GoogleCast",
            url: "https://github.com/SRGSSR/google-cast-sdk/releases/download/4.8.4/GoogleCast.xcframework.zip",
            checksum: "c9c3a794e8585198b59c6bb7da5418a3194ffa1ffa6f9a1cbdf4dc0ea26dc6cf"
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

        .testTarget(
            name: "BayitWidgetSharedTests",
            dependencies: ["BayitWidgetShared", "BayitCore"],
            path: "Packages/BayitWidgetShared/Tests/BayitWidgetSharedTests"
        ),

        .testTarget(
            name: "BayitNotificationsTests",
            dependencies: ["BayitNotifications", "BayitCore", "BayitNetworking"],
            path: "Packages/BayitNotifications/Tests/BayitNotificationsTests"
        ),

        .testTarget(
            name: "BayitCastTests",
            dependencies: ["BayitCast", "BayitCore", "BayitMedia"],
            path: "Packages/BayitCast/Tests/BayitCastTests"
        ),
    ]
)
