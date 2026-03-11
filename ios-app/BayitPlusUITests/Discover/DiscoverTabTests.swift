import XCTest

// MARK: - Discover Tab Base Tests

@MainActor final class DiscoverTabTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Tab Reachability

    func testDiscoverTabIsReachable() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let discoverTab = app.buttons["tab_discover"]
        XCTAssertTrue(discoverTab.waitForExistence(timeout: 8), "Discover tab button not found")
        XCTAssertTrue(discoverTab.isSelected, "Discover tab is not selected after switch")
    }

    // MARK: - Category Rows

    func testDiscoverTabShowsCategories() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 8), "Discover scroll view not found")

        let categories = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'discover_category'")
        )
        XCTAssertGreaterThanOrEqual(
            categories.count,
            5,
            "Expected at least 5 category rows in Discover tab"
        )
    }

    // MARK: - Feature Card Detail

    func testDiscoverFeatureCardTapOpensDetail() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let firstCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'discover_card'")
        ).firstMatch

        XCTAssertTrue(firstCard.waitForExistence(timeout: 8), "No Discover feature card found")
        firstCard.tap()

        let detailSheet = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'feature_detail' OR label CONTAINS[c] 'detail'")
        ).firstMatch
        XCTAssertTrue(detailSheet.waitForExistence(timeout: 5), "Feature detail sheet did not appear")
    }

    // MARK: - Screenshot

    func testDiscoverScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        _ = app.scrollViews.firstMatch.waitForExistence(timeout: 8)
        ScreenshotHelper.capture(app, name: "discover_tab_overview")
    }
}
