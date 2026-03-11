import XCTest

@MainActor
final class PauseAskTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
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
        NavigationHelper.switchToTab(app, tab: "Discover")
        ContentSourceHelper.navigateToVODContent(app, source: .youtube)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (YouTube)")

        pausePlayback()

        let askButton = findAskButton()
        XCTAssertTrue(askButton.waitForExistence(timeout: 5), "Ask button not found after pause (YouTube)")
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
        XCTAssertTrue(responseElement.exists, "AI response text did not appear (YouTube)")
        XCTAssertGreaterThan(
            responseElement.label.count, 20,
            "AI response too short — expected meaningful answer (YouTube)"
        )
        XCTAssertLessThan(elapsed, 10, "AI response took too long (YouTube): \(elapsed)s")

        ScreenshotHelper.capture(app, name: "pause_ask_youtube_response")
    }

    // MARK: - Helpers

    private func pausePlayback() {
        let pauseButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'pause'")
        ).firstMatch
        if pauseButton.waitForExistence(timeout: 5) {
            pauseButton.tap()
        } else {
            app.tap()
            let secondTry = app.buttons.matching(
                NSPredicate(format: "label CONTAINS[c] 'pause'")
            ).firstMatch
            if secondTry.waitForExistence(timeout: 3) {
                secondTry.tap()
            }
        }
    }

    private func findAskButton() -> XCUIElement {
        app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'ask' OR label CONTAINS[c] 'שאל'")
        ).firstMatch
    }

    private func typeQuestion(_ text: String) {
        let inputField = app.textFields.firstMatch
        if inputField.waitForExistence(timeout: 5) {
            inputField.tap()
            inputField.typeText(text)
            app.keyboards.buttons["return"].tap()
        } else {
            let textView = app.textViews.firstMatch
            XCTAssertTrue(textView.waitForExistence(timeout: 5), "No text input found for question")
            textView.tap()
            textView.typeText(text)
            app.keyboards.buttons["return"].tap()
        }
    }
}
