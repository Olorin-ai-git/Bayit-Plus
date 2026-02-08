import XCTest

@MainActor
final class VODTabUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - VOD Content

    func testVODTabShowsContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "VOD")

        let hasContent = NavigationHelper.verifyScreenHasContent(app)
        XCTAssertTrue(hasContent, "VOD tab has no content")
    }

    // MARK: - VOD Screenshot

    func testVODScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "VOD")

        ScreenshotHelper.captureScreen(app, screen: "vod")
    }
}
