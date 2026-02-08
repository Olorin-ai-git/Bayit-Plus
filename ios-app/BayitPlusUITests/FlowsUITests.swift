import XCTest

final class FlowsUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchToRoute("flows")
    }

    // MARK: - Flows Category

    @MainActor
    func testFlowsScreenLoads() {
        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Flows screen did not load content"
        )
    }

    @MainActor
    func testFlowsScreenshot() {
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "flows", language: "en")
    }
}
