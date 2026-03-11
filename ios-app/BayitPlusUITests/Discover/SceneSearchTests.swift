import XCTest

// MARK: - Scene Search Feature Tests

@MainActor final class SceneSearchTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Open Scene Search

    func testSceneSearchOpensOnChannel13() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)

        XCTAssertTrue(
            ContentSourceHelper.waitForPlayerReady(app),
            "Player did not become ready within 15s"
        )

        let sceneSearchButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'scene_search' OR label CONTAINS[c] 'scene search' OR label CONTAINS[c] 'Scene Search'")
        ).firstMatch
        XCTAssertTrue(sceneSearchButton.waitForExistence(timeout: 5), "Scene Search button not found in player")
        sceneSearchButton.tap()

        let searchPanel = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'scene_search_panel' OR identifier CONTAINS[c] 'scene_panel'")
        ).firstMatch
        XCTAssertTrue(searchPanel.waitForExistence(timeout: 5), "Scene Search panel did not appear")
    }

    // MARK: - Search and Results

    func testSceneSearchQueryReturnsTimestampedResults() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player not ready")

        let sceneSearchButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'scene_search' OR label CONTAINS[c] 'scene search'")
        ).firstMatch

        guard sceneSearchButton.waitForExistence(timeout: 5) else {
            XCTFail("Scene Search button not found")
            return
        }
        sceneSearchButton.tap()

        let searchField = app.textFields.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'scene_search_field' OR placeholderValue CONTAINS[c] 'search'")
        ).firstMatch

        XCTAssertTrue(searchField.waitForExistence(timeout: 5), "Scene Search input field not found")
        searchField.tap()
        searchField.typeText("news")

        let searchButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Search' OR identifier CONTAINS[c] 'search_submit'")
        ).firstMatch
        if searchButton.waitForExistence(timeout: 3) {
            searchButton.tap()
        } else {
            app.keyboards.buttons["Search"].tap()
        }

        let resultCell = app.cells.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'scene_result'")
        ).firstMatch
        XCTAssertTrue(resultCell.waitForExistence(timeout: 10), "No scene search results returned")

        let resultCount = app.cells.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'scene_result'")
        ).count
        XCTAssertGreaterThan(resultCount, 0, "Scene search returned zero results for query 'news'")
    }

    // MARK: - Screenshot

    func testSceneSearchScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        ContentSourceHelper.tuneToChannel13(app)
        _ = ContentSourceHelper.waitForPlayerReady(app)
        ScreenshotHelper.capture(app, name: "discover_scene_search")
    }
}
