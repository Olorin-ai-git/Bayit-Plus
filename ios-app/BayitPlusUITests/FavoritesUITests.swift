import XCTest

final class FavoritesUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "favorites")
    }

    // MARK: - Favorites Screen

    @MainActor
    func testFavoritesScreenLoads() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(screenLoaded, "Favorites screen did not load")

        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Favorites screen did not load content"
        )
    }

    @MainActor
    func testFavoritesScreenshot() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "favorites", language: "en")
    }
}
