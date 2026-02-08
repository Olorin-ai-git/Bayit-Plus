import XCTest

final class ProfileUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "profile")
    }

    // MARK: - Profile Screen

    @MainActor
    func testProfileScreenLoads() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(screenLoaded, "Profile screen did not load")

        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Profile screen did not load content"
        )
    }

    @MainActor
    func testProfileScreenshot() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "profile", language: "en")
    }
}
