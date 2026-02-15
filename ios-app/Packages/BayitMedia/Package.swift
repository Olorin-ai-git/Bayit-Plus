// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BayitMedia",
    platforms: [
        .iOS(.v17),
        .tvOS(.v17)
    ],
    products: [
        .library(
            name: "BayitMedia",
            targets: ["BayitMedia"]
        )
    ],
    dependencies: [
        .package(path: "../BayitCore")
    ],
    targets: [
        .target(
            name: "BayitMedia",
            dependencies: [
                .product(name: "BayitCore", package: "BayitCore")
            ]
        ),
        .testTarget(
            name: "BayitMediaTests",
            dependencies: ["BayitMedia"]
        )
    ]
)
