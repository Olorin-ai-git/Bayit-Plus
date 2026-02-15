// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BayitWidgetShared",
    platforms: [
        .iOS(.v17),
        .tvOS(.v17)
    ],
    products: [
        .library(
            name: "BayitWidgetShared",
            targets: ["BayitWidgetShared"]
        )
    ],
    dependencies: [
        .package(path: "../BayitCore")
    ],
    targets: [
        .target(
            name: "BayitWidgetShared",
            dependencies: [
                .product(name: "BayitCore", package: "BayitCore")
            ]
        ),
        .testTarget(
            name: "BayitWidgetSharedTests",
            dependencies: ["BayitWidgetShared"]
        )
    ]
)
