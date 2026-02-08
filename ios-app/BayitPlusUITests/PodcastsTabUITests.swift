import XCTest

@MainActor
final class PodcastsTabUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Podcasts Content

    func testPodcastsTabShowsContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Podcasts")

        let hasContent = NavigationHelper.verifyScreenHasContent(app)
        XCTAssertTrue(hasContent, "Podcasts tab has no content")
    }

    // MARK: - Podcasts Screenshot

    func testPodcastsScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Podcasts")

        ScreenshotHelper.captureScreen(app, screen: "podcasts")
    }
}
