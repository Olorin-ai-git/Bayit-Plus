import XCTest

final class YoungtersUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchToRoute("youngsters")
    }

    // MARK: - Youngsters Category

    @MainActor
    func testYoungtersScreenLoads() {
        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Youngsters screen did not load content"
        )
    }

    @MainActor
    func testYoungtersScreenshot() {
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "youngsters", language: "en")
    }
}
