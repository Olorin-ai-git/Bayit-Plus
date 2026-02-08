import XCTest

final class SecurityUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "security")
    }

    // MARK: - Security Screen

    @MainActor
    func testSecurityScreenLoads() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(screenLoaded, "Security screen did not load")

        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Security screen did not load content"
        )
    }

    @MainActor
    func testSecurityScreenshot() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "security", language: "en")
    }
}
