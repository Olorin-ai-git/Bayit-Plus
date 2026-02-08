import XCTest

@MainActor
final class HomeTabUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Home Content

    func testHomeTabShowsContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")

        let hasContent = NavigationHelper.verifyScreenHasContent(app)
        XCTAssertTrue(hasContent, "Home tab has no content")
    }

    // MARK: - Home Screenshot

    func testHomeScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")

        ScreenshotHelper.captureScreen(app, screen: "home")
    }
}
