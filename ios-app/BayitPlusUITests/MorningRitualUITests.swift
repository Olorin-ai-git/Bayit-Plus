import XCTest

final class MorningRitualUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchToRoute("morningRitual")
    }

    // MARK: - Morning Ritual Category

    @MainActor
    func testMorningRitualScreenLoads() {
        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Morning Ritual screen did not load content"
        )
    }

    @MainActor
    func testMorningRitualScreenshot() {
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "morningRitual", language: "en")
    }
}
