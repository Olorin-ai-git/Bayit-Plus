import XCTest

@MainActor
final class VocabularyTests: XCTestCase {
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

        openVocabularyPanel()

        let panelVisible = findVocabularyPanel()
        XCTAssertTrue(panelVisible.waitForExistence(timeout: 8), "Vocabulary panel did not appear (Plex)")

        let wordCount = countVocabularyWords()
        XCTAssertGreaterThan(wordCount, 0, "Vocabulary panel shows no words (Plex)")

        ScreenshotHelper.capture(app, name: "vocabulary_plex_panel")
    }

    // MARK: - YouTube

    func testFeatureWithYouTubeContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ContentSourceHelper.navigateToVODContent(app, source: .youtube)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (YouTube)")

        openVocabularyPanel()

        let panelVisible = findVocabularyPanel()
        XCTAssertTrue(panelVisible.waitForExistence(timeout: 8), "Vocabulary panel did not appear (YouTube)")

        let wordCount = countVocabularyWords()
        XCTAssertGreaterThan(wordCount, 0, "Vocabulary panel shows no words (YouTube)")

        ScreenshotHelper.capture(app, name: "vocabulary_youtube_panel")
    }

    // MARK: - Helpers

    private func openVocabularyPanel() {
        let vocabButton = app.buttons.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'vocab' OR label CONTAINS[c] 'words' " +
                    "OR label CONTAINS[c] 'אוצר מילים' OR label CONTAINS[c] 'מילים'"
            )
        ).firstMatch

        if vocabButton.waitForExistence(timeout: 5) {
            vocabButton.tap()
        } else {
            app.tap()
            let revealed = app.buttons.matching(
                NSPredicate(
                    format: "label CONTAINS[c] 'vocab' OR label CONTAINS[c] 'words' " +
                        "OR label CONTAINS[c] 'אוצר מילים'"
                )
            ).firstMatch
            if revealed.waitForExistence(timeout: 3) {
                revealed.tap()
            }
        }
    }

    private func findVocabularyPanel() -> XCUIElement {
        app.otherElements.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'vocab' OR label CONTAINS[c] 'words' " +
                    "OR label CONTAINS[c] 'אוצר מילים'"
            )
        ).firstMatch
    }

    private func countVocabularyWords() -> Int {
        let wordCells = app.collectionViews.cells
        if wordCells.firstMatch.waitForExistence(timeout: 5) {
            return wordCells.count
        }
        let wordRows = app.tables.cells
        if wordRows.firstMatch.waitForExistence(timeout: 3) {
            return wordRows.count
        }
        return app.staticTexts.matching(
            NSPredicate(
                format: "label.length > 1 AND label.length < 50 " +
                    "AND NOT (label CONTAINS[c] 'play') AND NOT (label CONTAINS[c] 'pause')"
            )
        ).count
    }
}
