import XCTest

// MARK: - LLM Search Feature Tests

@MainActor final class LLMSearchTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Open Search

    func testLLMSearchOpensFromDiscover() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let searchCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'llm_search' OR label CONTAINS[c] 'Smart Search' OR label CONTAINS[c] 'AI Search'")
        ).firstMatch
        XCTAssertTrue(searchCard.waitForExistence(timeout: 8), "LLM Search feature card not found")
        searchCard.tap()

        let searchField = app.textFields.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'llm_search_field' OR placeholderValue CONTAINS[c] 'search' OR placeholderValue CONTAINS[c] 'ask'")
        ).firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 8), "LLM Search input field not found")
    }

    // MARK: - Natural Language Query

    func testLLMSearchNaturalLanguageQueryReturnsResults() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let searchCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'llm_search' OR label CONTAINS[c] 'Smart Search' OR label CONTAINS[c] 'AI Search'")
        ).firstMatch

        guard searchCard.waitForExistence(timeout: 8) else {
            XCTFail("LLM Search card not found")
            return
        }
        searchCard.tap()

        let searchField = app.textFields.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'llm_search_field' OR placeholderValue CONTAINS[c] 'search'")
        ).firstMatch

        XCTAssertTrue(searchField.waitForExistence(timeout: 8), "Search field not found")
        searchField.tap()
        searchField.typeText("Israeli cooking shows")

        let submitButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Search' OR identifier CONTAINS[c] 'llm_search_submit'")
        ).firstMatch
        if submitButton.waitForExistence(timeout: 3) {
            submitButton.tap()
        } else {
            app.keyboards.buttons["Search"].tap()
        }

        let firstResult = app.cells.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'search_result' OR identifier CONTAINS[c] 'llm_result'")
        ).firstMatch
        XCTAssertTrue(firstResult.waitForExistence(timeout: 10), "LLM search returned no results for natural language query")

        let resultCount = app.cells.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'search_result' OR identifier CONTAINS[c] 'llm_result'")
        ).count
        XCTAssertGreaterThan(resultCount, 0, "LLM search results are empty")
    }

    // MARK: - Performance

    func testLLMSearchQueryResponseTime() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let searchCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'llm_search' OR label CONTAINS[c] 'Smart Search' OR label CONTAINS[c] 'AI Search'")
        ).firstMatch

        guard searchCard.waitForExistence(timeout: 8) else { return }
        searchCard.tap()

        let searchField = app.textFields.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'llm_search_field' OR placeholderValue CONTAINS[c] 'search'")
        ).firstMatch

        guard searchField.waitForExistence(timeout: 8) else { return }
        searchField.tap()
        searchField.typeText("Israeli cooking shows")

        let firstResult = app.cells.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'search_result' OR identifier CONTAINS[c] 'llm_result'")
        ).firstMatch

        let elapsed = ContentSourceHelper.measureResponseTime(
            action: {
                if let searchBtn = self.app.keyboards.buttons["Search"].exists ? Optional(self.app.keyboards.buttons["Search"]) : nil {
                    searchBtn.tap()
                }
            },
            waitForElement: firstResult,
            timeout: 10
        )
        XCTAssertLessThan(elapsed, 10, "LLM search query-to-results took longer than 10s: \(elapsed)s")
    }

    // MARK: - Screenshot

    func testLLMSearchScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ScreenshotHelper.capture(app, name: "discover_llm_search")
    }
}
