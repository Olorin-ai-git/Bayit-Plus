import XCTest

// MARK: - Live Dubbing Feature Tests

@MainActor final class LiveDubbingTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Enable Dubbing

    func testLiveDubbingActivatesOnChannel13() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)

        XCTAssertTrue(
            ContentSourceHelper.waitForPlayerReady(app),
            "Player did not become ready within 15s"
        )

        let dubbingButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'dubbing' OR label CONTAINS[c] 'dubbing' OR label CONTAINS[c] 'Dubbing'")
        ).firstMatch
        XCTAssertTrue(dubbingButton.waitForExistence(timeout: 5), "Dubbing control not found in player")
        dubbingButton.tap()

        let indicator = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'dubbing_active' OR label CONTAINS[c] 'dubbing active' OR label CONTAINS[c] 'Dubbing On'")
        ).firstMatch
        XCTAssertTrue(indicator.waitForExistence(timeout: 8), "Dubbing active indicator did not appear")
    }

    // MARK: - Dubbing Indicator State

    func testDubbingIndicatorPersistsAfterEnable() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player not ready")

        let dubbingButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'dubbing' OR label CONTAINS[c] 'dubbing'")
        ).firstMatch

        guard dubbingButton.waitForExistence(timeout: 5) else {
            XCTFail("Dubbing control not found")
            return
        }
        dubbingButton.tap()

        let indicator = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'dubbing_active'")
        ).firstMatch
        XCTAssertTrue(indicator.waitForExistence(timeout: 8), "Dubbing active state not persisted")
        XCTAssertTrue(indicator.exists, "Dubbing indicator disappeared unexpectedly")
    }

    // MARK: - Performance

    func testDubbingEnableResponseTime() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player not ready")

        let dubbingButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'dubbing' OR label CONTAINS[c] 'dubbing'")
        ).firstMatch
        XCTAssertTrue(dubbingButton.waitForExistence(timeout: 5), "Dubbing control not found")

        let indicator = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'dubbing_active'")
        ).firstMatch

        let elapsed = ContentSourceHelper.measureResponseTime(
            action: { dubbingButton.tap() },
            waitForElement: indicator,
            timeout: 10
        )
        XCTAssertLessThan(elapsed, 10, "Dubbing enable took longer than 10s: \(elapsed)s")
    }

    // MARK: - Screenshot

    func testDubbingScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        _ = ContentSourceHelper.waitForPlayerReady(app)
        ScreenshotHelper.capture(app, name: "discover_live_dubbing")
    }
}
