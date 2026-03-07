import XCTest

@MainActor
final class RadioTabUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Listen Content

    func testListenTabShowsContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Listen")

        let hasContent = NavigationHelper.verifyScreenHasContent(app)
        XCTAssertTrue(hasContent, "Listen tab has no content")
    }

    // MARK: - Listen Screenshot

    func testListenScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Listen")

        ScreenshotHelper.captureScreen(app, screen: "listen")
    }
}
