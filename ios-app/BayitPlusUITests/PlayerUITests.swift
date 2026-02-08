import XCTest

@MainActor
final class PlayerUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "play/sample?type=movie")
    }

    // MARK: - Player Content

    func testPlayerScreenLoads() {
        let playerLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(playerLoaded, "Player screen did not load")

        let hasPlayPause = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'play' OR label CONTAINS[c] 'pause'")
        ).firstMatch.exists
        let hasSlider = app.sliders.firstMatch.exists
        let hasContent = app.staticTexts.count > 0

        XCTAssertTrue(
            hasPlayPause || hasSlider || hasContent,
            "Player screen has no recognizable controls"
        )
    }

    // MARK: - Player Screenshot

    func testPlayerScreenshot() {
        let playerLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(playerLoaded, "Player screen did not load for screenshot")

        ScreenshotHelper.captureScreen(app, screen: "player")
    }
}
