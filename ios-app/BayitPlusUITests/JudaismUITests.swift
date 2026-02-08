import XCTest

final class JudaismUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchToRoute("judaism")
    }

    // MARK: - Judaism Category

    @MainActor
    func testJudaismScreenLoads() {
        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Judaism screen did not load content"
        )
    }

    @MainActor
    func testJudaismScreenshot() {
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "judaism", language: "en")
    }
}
