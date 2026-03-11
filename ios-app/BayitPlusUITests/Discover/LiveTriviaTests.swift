import XCTest

// MARK: - Live Trivia Feature Tests

@MainActor final class LiveTriviaTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Trivia Overlay

    func testLiveTriviaOverlayOpensOnChannel13() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)

        XCTAssertTrue(
            ContentSourceHelper.waitForPlayerReady(app),
            "Player did not become ready within 15s"
        )

        let triviaButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'trivia' OR label CONTAINS[c] 'trivia' OR label CONTAINS[c] 'Trivia'")
        ).firstMatch
        XCTAssertTrue(triviaButton.waitForExistence(timeout: 5), "Trivia button not found in player")
        triviaButton.tap()

        let triviaOverlay = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'trivia_overlay' OR identifier CONTAINS[c] 'trivia_panel'")
        ).firstMatch
        XCTAssertTrue(triviaOverlay.waitForExistence(timeout: 5), "Trivia overlay did not appear")
    }

    // MARK: - Question and Answers

    func testTriviaOverlayShowsQuestionAndAnswers() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player not ready")

        let triviaButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'trivia' OR label CONTAINS[c] 'trivia'")
        ).firstMatch

        guard triviaButton.waitForExistence(timeout: 5) else {
            XCTFail("Trivia button not found")
            return
        }
        triviaButton.tap()

        let questionLabel = app.staticTexts.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'trivia_question' OR label.length > 10")
        ).firstMatch
        XCTAssertTrue(questionLabel.waitForExistence(timeout: 5), "Trivia question not displayed")

        let answerOptions = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'trivia_answer'")
        )
        XCTAssertGreaterThanOrEqual(
            answerOptions.count,
            2,
            "Expected at least 2 answer options in trivia overlay"
        )
    }

    // MARK: - Screenshot

    func testTriviaScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        _ = ContentSourceHelper.waitForPlayerReady(app)
        ScreenshotHelper.capture(app, name: "discover_live_trivia")
    }
}
