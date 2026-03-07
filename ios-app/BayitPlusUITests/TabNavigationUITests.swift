import XCTest

final class TabNavigationUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--skip-auth"]
        app.launch()
    }

    // MARK: - Tab Bar Exists

    func testTabBarIsVisible() {
        let homeTab = app.buttons["tab_home"]
        XCTAssertTrue(homeTab.waitForExistence(timeout: 8))
    }

    func testAllTabsExist() {
        XCTAssertTrue(app.buttons["tab_home"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["tab_liveTV"].exists)
        XCTAssertTrue(app.buttons["tab_podcasts"].exists)
        XCTAssertTrue(app.buttons["tab_search"].exists)
    }

    // MARK: - Tab Switching

    func testSwitchToLiveTVTab() {
        let liveTab = app.buttons["tab_liveTV"]
        XCTAssertTrue(liveTab.waitForExistence(timeout: 8))
        liveTab.tap()

        XCTAssertTrue(liveTab.isSelected)
    }

    func testSwitchToListenTab() {
        XCTAssertTrue(app.buttons["tab_home"].waitForExistence(timeout: 10))
        let listenTab = app.buttons["tab_podcasts"]
        XCTAssertTrue(listenTab.exists, "tab_podcasts not found")
        listenTab.tap()
    }

    func testSwitchToSearchTab() {
        let searchTab = app.buttons["tab_search"]
        XCTAssertTrue(searchTab.waitForExistence(timeout: 8))
        searchTab.tap()

        XCTAssertTrue(searchTab.isSelected)
    }

    func testSwitchBackToHomeTab() {
        let liveTab = app.buttons["tab_liveTV"]
        XCTAssertTrue(liveTab.waitForExistence(timeout: 8))
        liveTab.tap()

        let homeTab = app.buttons["tab_home"]
        homeTab.tap()

        XCTAssertTrue(homeTab.isSelected)
    }

    // MARK: - Tab Content Loads

    func testHomeTabShowsContent() {
        let homeTab = app.buttons["tab_home"]
        XCTAssertTrue(homeTab.waitForExistence(timeout: 8))

        // Home should show either content or loading indicator
        let hasContent = app.scrollViews.firstMatch.waitForExistence(timeout: 5)
        XCTAssertTrue(hasContent)
    }

    func testLiveTVTabShowsContent() {
        let liveTab = app.buttons["tab_liveTV"]
        XCTAssertTrue(liveTab.waitForExistence(timeout: 8))
        liveTab.tap()

        let hasContent = app.scrollViews.firstMatch.waitForExistence(timeout: 5)
        XCTAssertTrue(hasContent)
    }
}
