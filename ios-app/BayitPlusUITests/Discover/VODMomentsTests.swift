import XCTest

@MainActor
final class VODMomentsTests: XCTestCase {
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

        openMomentsPanel()

        let panelElement = findMomentsPanel()
        XCTAssertTrue(panelElement.waitForExistence(timeout: 8), "Moments panel did not appear (Plex)")

        let momentCount = countMoments()
        XCTAssertGreaterThan(momentCount, 0, "Moments panel shows no moments (Plex)")

        ScreenshotHelper.capture(app, name: "vod_moments_plex_panel")
    }

    // MARK: - YouTube

    func testFeatureWithYouTubeContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ContentSourceHelper.navigateToVODContent(app, source: .youtube)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (YouTube)")

        openMomentsPanel()

        let panelElement = findMomentsPanel()
        XCTAssertTrue(panelElement.waitForExistence(timeout: 8), "Moments panel did not appear (YouTube)")

        let momentCount = countMoments()
        XCTAssertGreaterThan(momentCount, 0, "Moments panel shows no moments (YouTube)")

        ScreenshotHelper.capture(app, name: "vod_moments_youtube_panel")
    }

    // MARK: - Helpers

    private func openMomentsPanel() {
        let momentsButton = app.buttons.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'moment' OR label CONTAINS[c] 'רגעים' " +
                    "OR label CONTAINS[c] 'highlights' OR label CONTAINS[c] 'clips'"
            )
        ).firstMatch

        if momentsButton.waitForExistence(timeout: 5) {
            momentsButton.tap()
        } else {
            app.tap()
            let revealed = app.buttons.matching(
                NSPredicate(
                    format: "label CONTAINS[c] 'moment' OR label CONTAINS[c] 'רגעים' " +
                        "OR label CONTAINS[c] 'highlights'"
                )
            ).firstMatch
            if revealed.waitForExistence(timeout: 3) {
                revealed.tap()
            }
        }
    }

    private func findMomentsPanel() -> XCUIElement {
        app.otherElements.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'moment' OR label CONTAINS[c] 'רגעים' " +
                    "OR label CONTAINS[c] 'highlight'"
            )
        ).firstMatch
    }

    private func countMoments() -> Int {
        let timestampTexts = app.staticTexts.matching(
            NSPredicate(format: "label MATCHES '.*[0-9]+:[0-9]+.*'")
        )
        if timestampTexts.count > 0 {
            return timestampTexts.count
        }
        let cells = app.collectionViews.cells
        if cells.firstMatch.waitForExistence(timeout: 5) {
            return cells.count
        }
        return app.tables.cells.count
    }
}
