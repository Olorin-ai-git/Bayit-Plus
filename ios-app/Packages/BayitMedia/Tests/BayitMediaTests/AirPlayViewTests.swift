#if os(iOS)
import XCTest
import SwiftUI
import UIKit
@testable import BayitMedia

final class AirPlayViewTests: XCTestCase {

    // MARK: - Initialization Tests

    func testAirPlayViewDefaultInitialization() {
        let airPlayView = AirPlayView()

        XCTAssertNotNil(airPlayView)
    }

    func testAirPlayViewCustomTintColor() {
        let customTintColor = UIColor.systemRed
        let airPlayView = AirPlayView(tintColor: customTintColor)

        XCTAssertNotNil(airPlayView)
    }

    func testAirPlayViewCustomActiveTintColor() {
        let customActiveTintColor = UIColor.systemGreen
        let airPlayView = AirPlayView(activeTintColor: customActiveTintColor)

        XCTAssertNotNil(airPlayView)
    }

    func testAirPlayViewCustomPrioritizesVideoDevices() {
        let airPlayView = AirPlayView(prioritizesVideoDevices: false)

        XCTAssertNotNil(airPlayView)
    }

    func testAirPlayViewFullCustomInitialization() {
        let airPlayView = AirPlayView(
            tintColor: .systemBlue,
            activeTintColor: .systemOrange,
            prioritizesVideoDevices: true
        )

        XCTAssertNotNil(airPlayView)
    }

    // MARK: - UIViewRepresentable Tests

    func testAirPlayViewMakesUIView() {
        let airPlayView = AirPlayView()
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)

        XCTAssertNotNil(uiView)
        XCTAssertTrue(type(of: uiView).self is AVRoutePickerView.Type)
    }

    func testMakeUIViewAppliesTintColor() {
        let customTintColor = UIColor.systemRed
        let airPlayView = AirPlayView(tintColor: customTintColor)
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)

        XCTAssertEqual(uiView.tintColor, customTintColor)
    }

    func testMakeUIViewAppliesActiveTintColor() {
        let customActiveTintColor = UIColor.systemGreen
        let airPlayView = AirPlayView(activeTintColor: customActiveTintColor)
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)

        XCTAssertEqual(uiView.activeTintColor, customActiveTintColor)
    }

    func testMakeUIViewAppliesPrioritizesVideoDevices() {
        let airPlayView = AirPlayView(prioritizesVideoDevices: true)
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)

        XCTAssertTrue(uiView.prioritizesVideoDevices)
    }

    func testMakeUIViewAppliesPrioritizesVideoDevicesFalse() {
        let airPlayView = AirPlayView(prioritizesVideoDevices: false)
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)

        XCTAssertFalse(uiView.prioritizesVideoDevices)
    }

    // MARK: - Update Tests

    func testUpdateUIViewUpdatesTintColor() {
        let initialColor = UIColor.systemPurple
        let updatedColor = UIColor.systemBlue
        let airPlayView = AirPlayView(tintColor: updatedColor)
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)
        uiView.tintColor = initialColor

        airPlayView.updateUIView(uiView, context: context)

        XCTAssertEqual(uiView.tintColor, updatedColor)
    }

    func testUpdateUIViewUpdatesActiveTintColor() {
        let initialColor = UIColor.systemYellow
        let updatedColor = UIColor.systemPink
        let airPlayView = AirPlayView(activeTintColor: updatedColor)
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)
        uiView.activeTintColor = initialColor

        airPlayView.updateUIView(uiView, context: context)

        XCTAssertEqual(uiView.activeTintColor, updatedColor)
    }

    // MARK: - Default Values Tests

    func testDefaultTintColorIsPurple() {
        let airPlayView = AirPlayView()
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)

        XCTAssertEqual(uiView.tintColor, .systemPurple)
    }

    func testDefaultActiveTintColorIsPurple() {
        let airPlayView = AirPlayView()
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)

        XCTAssertEqual(uiView.activeTintColor, .systemPurple)
    }

    func testDefaultPrioritizesVideoDevicesIsTrue() {
        let airPlayView = AirPlayView()
        let context = TestContext()

        let uiView = airPlayView.makeUIView(context: context)

        XCTAssertTrue(uiView.prioritizesVideoDevices)
    }

    // MARK: - Multiple Color Tests

    func testMultipleColorCombinations() {
        let testCases: [(UIColor, UIColor)] = [
            (.systemRed, .systemBlue),
            (.systemGreen, .systemYellow),
            (.systemOrange, .systemPink),
            (.systemIndigo, .systemTeal)
        ]

        for (tintColor, activeTintColor) in testCases {
            let airPlayView = AirPlayView(
                tintColor: tintColor,
                activeTintColor: activeTintColor
            )
            let context = TestContext()
            let uiView = airPlayView.makeUIView(context: context)

            XCTAssertEqual(uiView.tintColor, tintColor)
            XCTAssertEqual(uiView.activeTintColor, activeTintColor)
        }
    }

    // MARK: - Integration Tests

    func testAirPlayViewCanBeUsedInSwiftUIView() {
        struct TestView: View {
            var body: some View {
                AirPlayView()
                    .frame(width: 44, height: 44)
            }
        }

        let testView = TestView()
        XCTAssertNotNil(testView)
    }
}

// MARK: - Test Context Helper

private struct TestContext: UIViewRepresentableContext {
    typealias Coordinator = Void

    var coordinator: Void { () }
    var transaction: Transaction { Transaction() }
    var environment: EnvironmentValues { EnvironmentValues() }
}
#endif
