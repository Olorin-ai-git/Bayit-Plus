import XCTest

final class PlaylistUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "playlist")
    }

    // MARK: - Playlist Screen

    @MainActor
    func testPlaylistScreenLoads() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(screenLoaded, "Playlist screen did not load")

        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Playlist screen did not load content"
        )
    }

    @MainActor
    func testPlaylistScreenshot() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "playlist", language: "en")
    }
}
