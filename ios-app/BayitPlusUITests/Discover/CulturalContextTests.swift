import XCTest

@MainActor
final class CulturalContextTests: XCTestCase {
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

        openCulturalContext()

        let contextCard = findContextCard()
        XCTAssertTrue(contextCard.waitForExistence(timeout: 8), "Cultural context card did not appear (Plex)")

        let explanationText = findExplanationText()
        XCTAssertTrue(explanationText.waitForExistence(timeout: 5), "Cultural context explanation not found (Plex)")
        XCTAssertGreaterThan(
            explanationText.label.count, 20,
            "Cultural context explanation too short (Plex)"
        )

        ScreenshotHelper.capture(app, name: "cultural_context_plex_card")
    }

    // MARK: - YouTube

    func testFeatureWithYouTubeContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ContentSourceHelper.navigateToVODContent(app, source: .youtube)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (YouTube)")

        openCulturalContext()

        let contextCard = findContextCard()
        XCTAssertTrue(contextCard.waitForExistence(timeout: 8), "Cultural context card did not appear (YouTube)")

        let explanationText = findExplanationText()
        XCTAssertTrue(explanationText.waitForExistence(timeout: 5), "Cultural context explanation not found (YouTube)")
        XCTAssertGreaterThan(
            explanationText.label.count, 20,
            "Cultural context explanation too short (YouTube)"
        )

        ScreenshotHelper.capture(app, name: "cultural_context_youtube_card")
    }

    // MARK: - Helpers

    private func openCulturalContext() {
        let contextButton = app.buttons.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'cultural' OR label CONTAINS[c] 'context' " +
                    "OR label CONTAINS[c] 'הקשר' OR label CONTAINS[c] 'תרבות'"
            )
        ).firstMatch

        if contextButton.waitForExistence(timeout: 5) {
            contextButton.tap()
        } else {
            app.tap()
            let revealed = app.buttons.matching(
                NSPredicate(
                    format: "label CONTAINS[c] 'cultural' OR label CONTAINS[c] 'context' " +
                        "OR label CONTAINS[c] 'הקשר'"
                )
            ).firstMatch
            if revealed.waitForExistence(timeout: 3) {
                revealed.tap()
            }
        }
    }

    private func findContextCard() -> XCUIElement {
        app.otherElements.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'cultural' OR label CONTAINS[c] 'context' " +
                    "OR label CONTAINS[c] 'הקשר' OR label CONTAINS[c] 'תרבות'"
            )
        ).firstMatch
    }

    private func findExplanationText() -> XCUIElement {
        app.staticTexts.matching(
            NSPredicate(format: "label.length > 20")
        ).firstMatch
    }
}
