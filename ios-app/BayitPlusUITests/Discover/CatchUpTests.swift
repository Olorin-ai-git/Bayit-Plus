import XCTest

// MARK: - Catch-Up TV Feature Tests

@MainActor final class CatchUpTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Activate Catch-Up

    func testCatchUpActivatesTimelineScrubberOnChannel13() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)

        XCTAssertTrue(
            ContentSourceHelper.waitForPlayerReady(app),
            "Player did not become ready within 15s"
        )

        let catchUpButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'catch_up' OR label CONTAINS[c] 'catch up' OR label CONTAINS[c] 'Catch Up' OR label CONTAINS[c] 'catchup'")
        ).firstMatch
        XCTAssertTrue(catchUpButton.waitForExistence(timeout: 5), "Catch-Up control not found in player")
        catchUpButton.tap()

        let timelineScrubber = app.sliders.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'timeline' OR identifier CONTAINS[c] 'scrubber' OR identifier CONTAINS[c] 'seek'")
        ).firstMatch
        XCTAssertTrue(timelineScrubber.waitForExistence(timeout: 8), "Timeline scrubber did not appear after catch-up activation")
    }

    // MARK: - Scrub Backwards

    func testCatchUpScrubBackwardsPlaysFromPast() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player not ready")

        let catchUpButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'catch_up' OR label CONTAINS[c] 'catch up' OR label CONTAINS[c] 'Catch Up'")
        ).firstMatch

        guard catchUpButton.waitForExistence(timeout: 5) else {
            XCTFail("Catch-Up button not found")
            return
        }
        catchUpButton.tap()

        let scrubber = app.sliders.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'timeline' OR identifier CONTAINS[c] 'scrubber'")
        ).firstMatch

        guard scrubber.waitForExistence(timeout: 8) else {
            XCTFail("Timeline scrubber not found")
            return
        }

        // Scrub to 20% position (backwards into past content)
        scrubber.adjust(toNormalizedSliderPosition: 0.2)

        let pastTimestamp = app.staticTexts.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'playback_time' OR identifier CONTAINS[c] 'current_time'")
        ).firstMatch
        XCTAssertTrue(pastTimestamp.waitForExistence(timeout: 5), "Playback timestamp not visible after scrub")
    }

    // MARK: - Screenshot

    func testCatchUpScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        _ = ContentSourceHelper.waitForPlayerReady(app)
        ScreenshotHelper.capture(app, name: "discover_catch_up")
    }
}
