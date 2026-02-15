// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BayitCore",
    platforms: [
        .iOS(.v17),
        .tvOS(.v17)
    ],
    products: [
        .library(
            name: "BayitCore",
            targets: ["BayitCore"]
        )
    ],
    targets: [
        .target(
            name: "BayitCore",
            dependencies: []
        ),
        .testTarget(
            name: "BayitCoreTests",
            dependencies: ["BayitCore"]
        )
    ]
)
