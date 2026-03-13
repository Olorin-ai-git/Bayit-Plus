import XCTest

@MainActor
final class PauseAskTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(authenticateForAI: true)
    }

    // MARK: - Plex

    func testFeatureWithPlexContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ContentSourceHelper.navigateToVODContent(app, source: .plex)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (Plex)")

        pausePlayback()

        let askButton = findAskButton()
        XCTAssertTrue(askButton.waitForExistence(timeout: 5), "Ask button not found after pause (Plex)")
        askButton.tap()

        typeQuestion("What is happening in this scene?")

        let responseElement = app.staticTexts.matching(
            NSPredicate(format: "label.length > 20")
        ).firstMatch
        let elapsed = ContentSourceHelper.measureResponseTime(
            action: { /* question already submitted */ },
            waitForElement: responseElement,
            timeout: 10
        )
        XCTAssertTrue(responseElement.exists, "AI response text did not appear (Plex)")
        XCTAssertGreaterThan(
            responseElement.label.count, 20,
            "AI response too short — expected meaningful answer (Plex)"
        )
        XCTAssertLessThan(elapsed, 10, "AI response took too long (Plex): \(elapsed)s")

        ScreenshotHelper.capture(app, name: "pause_ask_plex_response")
    }

    // MARK: - YouTube

    func testFeatureWithYouTubeContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.navigateToVODContent(app, source: .youtube)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (YouTube)")

        // Tap player to show controls
        app.tap()

        // Verify Pause & Ask button is accessible in player for YouTube BYOC
        let askButton = app.buttons.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'ask' OR label CONTAINS[c] 'שאל' " +
                    "OR label CONTAINS[c] 'pause' OR label CONTAINS[c] 'bubble'"
            )
        ).firstMatch
        if !askButton.waitForExistence(timeout: 5) {
            // Controls may have auto-hidden; tap again
            app.tap()
        }
        let askById = app.buttons["discover_pause_ask_step3"]
        XCTAssertTrue(
            askById.waitForExistence(timeout: 8) || askButton.waitForExistence(timeout: 3),
            "Pause & Ask button not accessible in player (YouTube)"
        )

        ScreenshotHelper.capture(app, name: "pause_ask_youtube")
    }

    // MARK: - Helpers

    private func pausePlayback() {
        // Tap player area to show controls
        app.tap()

        let pauseButton = app.buttons.matching(
            NSPredicate(
                format: "label ==[c] 'Pause' OR label ==[c] 'pause' " +
                    "OR label CONTAINS[c] 'השהה'"
            )
        ).firstMatch
        if pauseButton.waitForExistence(timeout: 5) {
            pauseButton.tap()
        } else {
            // Controls may have hidden, tap again
            app.tap()
            let secondTry = app.buttons.matching(
                NSPredicate(
                    format: "label ==[c] 'Pause' OR label ==[c] 'pause' " +
                        "OR label CONTAINS[c] 'השהה'"
                )
            ).firstMatch
            if secondTry.waitForExistence(timeout: 3) {
                secondTry.tap()
            }
        }
    }

    private func findAskButton() -> XCUIElement {
        let playerAsk = app.buttons["discover_pause_ask_step3"]
        if playerAsk.exists { return playerAsk }
        return app.buttons.matching(
            NSPredicate(
                format: "(label CONTAINS[c] 'ask' OR label CONTAINS[c] 'שאל') " +
                    "AND NOT (label CONTAINS[c] 'Pause &')"
            )
        ).firstMatch
    }

    private func typeQuestion(_ text: String) {
        let dialogueInput = app.textFields["dialogueQuestionInput"]
        if dialogueInput.waitForExistence(timeout: 8) {
            dialogueInput.tap()
            dialogueInput.typeText(text)
            let sendButton = app.buttons.matching(
                NSPredicate(
                    format: "label CONTAINS[c] 'send' OR label CONTAINS[c] 'שלח'"
                )
            ).firstMatch
            if sendButton.waitForExistence(timeout: 3) {
                sendButton.tap()
            } else {
                app.keyboards.buttons["return"].tap()
            }
        } else {
            let anyInput = app.textFields.firstMatch
            XCTAssertTrue(anyInput.waitForExistence(timeout: 5), "No text input found for question")
            anyInput.tap()
            anyInput.typeText(text)
            app.keyboards.buttons["return"].tap()
        }
    }
}
