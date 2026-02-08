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
        XCTAssertTrue(app.buttons["tab_vod"].exists)
        XCTAssertTrue(app.buttons["tab_radio"].exists)
        XCTAssertTrue(app.buttons["tab_podcasts"].exists)
    }

    // MARK: - Tab Switching

    func testSwitchToLiveTVTab() {
        let liveTab = app.buttons["tab_liveTV"]
        XCTAssertTrue(liveTab.waitForExistence(timeout: 8))
        liveTab.tap()

        XCTAssertTrue(liveTab.isSelected)
    }

    func testSwitchToVODTab() {
        let vodTab = app.buttons["tab_vod"]
        XCTAssertTrue(vodTab.waitForExistence(timeout: 8))
        vodTab.tap()

        XCTAssertTrue(vodTab.isSelected)
    }

    func testSwitchToRadioTab() {
        let radioTab = app.buttons["tab_radio"]
        XCTAssertTrue(radioTab.waitForExistence(timeout: 8))
        radioTab.tap()

        XCTAssertTrue(radioTab.isSelected)
    }

    func testSwitchToPodcastsTab() {
        let podcastsTab = app.buttons["tab_podcasts"]
        XCTAssertTrue(podcastsTab.waitForExistence(timeout: 8))
        podcastsTab.tap()

        XCTAssertTrue(podcastsTab.isSelected)
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
