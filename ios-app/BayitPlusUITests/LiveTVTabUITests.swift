import XCTest

@MainActor
final class LiveTVTabUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Live TV Content

    func testLiveTVTabShowsContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Live TV")

        let hasContent = NavigationHelper.verifyScreenHasContent(app)
        XCTAssertTrue(hasContent, "Live TV tab has no content")
    }

    // MARK: - Live TV Screenshot

    func testLiveTVScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Live TV")

        ScreenshotHelper.captureScreen(app, screen: "livetv")
    }
}
