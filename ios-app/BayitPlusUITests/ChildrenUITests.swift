import XCTest

final class ChildrenUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchToRoute("children")
    }

    // MARK: - Children Category

    @MainActor
    func testChildrenScreenLoads() {
        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Children screen did not load content"
        )
    }

    @MainActor
    func testChildrenScreenshot() {
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "children", language: "en")
    }
}
