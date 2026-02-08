import XCTest

final class LanguageSettingsUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "languageSettings")
    }

    // MARK: - Language Settings

    @MainActor
    func testLanguageSettingsScreenLoads() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(screenLoaded, "Language settings screen did not load")

        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app),
            "Language settings screen did not load content"
        )
    }

    @MainActor
    func testLanguageSettingsScreenshot() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        _ = NavigationHelper.verifyScreenHasContent(app)
        ScreenshotHelper.captureScreen(app, screen: "languageSettings", language: "en")
    }
}
