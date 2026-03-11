import XCTest

@MainActor
final class BilingualBridgeTests: XCTestCase {
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

        enableBilingualMode()

        XCTAssertTrue(
            hebrewSubtitleVisible(),
            "Hebrew subtitle text not visible in bilingual mode (Plex)"
        )
        XCTAssertTrue(
            englishSubtitleVisible(),
            "English subtitle text not visible in bilingual mode (Plex)"
        )

        ScreenshotHelper.capture(app, name: "bilingual_bridge_plex_subtitles")
    }

    // MARK: - YouTube

    func testFeatureWithYouTubeContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ContentSourceHelper.navigateToVODContent(app, source: .youtube)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (YouTube)")

        enableBilingualMode()

        XCTAssertTrue(
            hebrewSubtitleVisible(),
            "Hebrew subtitle text not visible in bilingual mode (YouTube)"
        )
        XCTAssertTrue(
            englishSubtitleVisible(),
            "English subtitle text not visible in bilingual mode (YouTube)"
        )

        ScreenshotHelper.capture(app, name: "bilingual_bridge_youtube_subtitles")
    }

    // MARK: - Helpers

    private func enableBilingualMode() {
        let bilingualButton = app.buttons.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'bilingual' OR label CONTAINS[c] 'dual' " +
                    "OR label CONTAINS[c] 'דו-לשוני' OR label CONTAINS[c] 'bridge'"
            )
        ).firstMatch

        if bilingualButton.waitForExistence(timeout: 5) {
            bilingualButton.tap()
        } else {
            app.tap()
            let revealed = app.buttons.matching(
                NSPredicate(
                    format: "label CONTAINS[c] 'bilingual' OR label CONTAINS[c] 'dual' " +
                        "OR label CONTAINS[c] 'דו-לשוני'"
                )
            ).firstMatch
            if revealed.waitForExistence(timeout: 3) {
                revealed.tap()
            }
        }

        _ = app.staticTexts.firstMatch.waitForExistence(timeout: 5)
    }

    private func hebrewSubtitleVisible() -> Bool {
        let hebrewText = app.staticTexts.matching(
            NSPredicate(
                format: "label MATCHES '.*[\\u05D0-\\u05EA]+.*'"
            )
        ).firstMatch
        return hebrewText.waitForExistence(timeout: 5)
    }

    private func englishSubtitleVisible() -> Bool {
        let englishText = app.staticTexts.matching(
            NSPredicate(
                format: "label MATCHES '.*[a-zA-Z]+.*' " +
                    "AND NOT (label CONTAINS[c] 'bilingual') " +
                    "AND NOT (label CONTAINS[c] 'play') " +
                    "AND NOT (label CONTAINS[c] 'pause')"
            )
        ).firstMatch
        return englishText.waitForExistence(timeout: 5)
    }
}
