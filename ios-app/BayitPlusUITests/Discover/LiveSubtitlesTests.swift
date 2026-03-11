import XCTest

// MARK: - Live Subtitles Feature Tests

@MainActor final class LiveSubtitlesTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Enable Subtitles

    func testLiveSubtitlesAppearOnChannel13() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)

        XCTAssertTrue(
            ContentSourceHelper.waitForPlayerReady(app),
            "Player did not become ready within 15s"
        )

        let subtitlesButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'subtitles' OR label CONTAINS[c] 'subtitles' OR label CONTAINS[c] 'Subtitles' OR label CONTAINS[c] 'CC'")
        ).firstMatch
        XCTAssertTrue(subtitlesButton.waitForExistence(timeout: 5), "Subtitles control not found in player")
        subtitlesButton.tap()

        let subtitleText = app.staticTexts.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'subtitle_line' OR label.length > 5")
        ).firstMatch
        XCTAssertTrue(subtitleText.waitForExistence(timeout: 10), "Subtitle text did not appear on screen")
    }

    // MARK: - Real-Time Update

    func testLiveSubtitlesUpdateInRealTime() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player not ready")

        let subtitlesButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'subtitles' OR label CONTAINS[c] 'subtitles' OR label CONTAINS[c] 'CC'")
        ).firstMatch

        guard subtitlesButton.waitForExistence(timeout: 5) else {
            XCTFail("Subtitles control not found")
            return
        }
        subtitlesButton.tap()

        let subtitleLine = app.staticTexts.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'subtitle_line'")
        ).firstMatch

        guard subtitleLine.waitForExistence(timeout: 10) else {
            XCTFail("Initial subtitle line not found")
            return
        }

        let initialValue = subtitleLine.label

        // Wait 10 seconds for real-time update
        let updateExpectation = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label != %@", initialValue),
            object: subtitleLine
        )
        let result = XCTWaiter.wait(for: [updateExpectation], timeout: 10)
        XCTAssertEqual(result, .completed, "Subtitle text did not update within 10 seconds")
    }

    // MARK: - Screenshot

    func testSubtitlesScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        _ = ContentSourceHelper.waitForPlayerReady(app)
        ScreenshotHelper.capture(app, name: "discover_live_subtitles")
    }
}
