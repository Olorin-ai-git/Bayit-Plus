import XCTest

@MainActor
final class InteractiveSubtitlesTests: XCTestCase {
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

        enableSubtitlesIfNeeded()

        let subtitleWord = findSubtitleWord()
        XCTAssertTrue(subtitleWord.waitForExistence(timeout: 8), "No subtitle word found to tap (Plex)")
        subtitleWord.tap()

        let popup = findDefinitionPopup()
        XCTAssertTrue(popup.waitForExistence(timeout: 5), "Definition popup did not appear (Plex)")
        XCTAssertTrue(popup.label.count > 0, "Definition popup text is empty (Plex)")

        ScreenshotHelper.capture(app, name: "interactive_subtitles_plex_popup")
    }

    // MARK: - YouTube

    func testFeatureWithYouTubeContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ContentSourceHelper.navigateToVODContent(app, source: .youtube)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (YouTube)")

        enableSubtitlesIfNeeded()

        let subtitleWord = findSubtitleWord()
        XCTAssertTrue(subtitleWord.waitForExistence(timeout: 8), "No subtitle word found to tap (YouTube)")
        subtitleWord.tap()

        let popup = findDefinitionPopup()
        XCTAssertTrue(popup.waitForExistence(timeout: 5), "Definition popup did not appear (YouTube)")
        XCTAssertTrue(popup.label.count > 0, "Definition popup text is empty (YouTube)")

        ScreenshotHelper.capture(app, name: "interactive_subtitles_youtube_popup")
    }

    // MARK: - Helpers

    private func enableSubtitlesIfNeeded() {
        let subtitlesButton = app.buttons.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'subtitle' OR label CONTAINS[c] 'cc' OR label CONTAINS[c] 'כתוביות'"
            )
        ).firstMatch

        if subtitlesButton.waitForExistence(timeout: 5) {
            let subtitlesOn = app.staticTexts.matching(
                NSPredicate(format: "label CONTAINS[c] 'subtitle' OR label CONTAINS[c] 'כתוביות'")
            ).firstMatch
            if !subtitlesOn.exists {
                subtitlesButton.tap()
            }
        }
    }

    private func findSubtitleWord() -> XCUIElement {
        app.staticTexts.matching(
            NSPredicate(
                format: "label.length > 1 AND label.length < 30 " +
                    "AND NOT (label CONTAINS[c] 'play') " +
                    "AND NOT (label CONTAINS[c] 'pause') " +
                    "AND NOT (label CONTAINS[c] 'subtitle')"
            )
        ).firstMatch
    }

    private func findDefinitionPopup() -> XCUIElement {
        app.otherElements.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'definition' OR label CONTAINS[c] 'meaning' " +
                    "OR label CONTAINS[c] 'הגדרה' OR label CONTAINS[c] 'פירוש'"
            )
        ).firstMatch
    }
}
