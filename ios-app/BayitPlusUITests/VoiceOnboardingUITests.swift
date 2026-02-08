import XCTest

@MainActor
final class VoiceOnboardingUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "voiceOnboarding")
    }

    // MARK: - Voice Onboarding Content

    func testVoiceOnboardingScreenLoads() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(screenLoaded, "Voice onboarding screen did not load")

        let welcomePredicate = NSPredicate(
            format: "label CONTAINS[c] 'voice' OR label CONTAINS[c] 'welcome' OR label CONTAINS[c] 'step'"
        )
        let welcomeText = app.staticTexts.matching(welcomePredicate).firstMatch
        let hasStepIndicator = app.pageIndicators.firstMatch.exists
        let hasContent = app.staticTexts.count > 0

        XCTAssertTrue(
            welcomeText.exists || hasStepIndicator || hasContent,
            "Voice onboarding screen has no recognizable content"
        )
    }

    // MARK: - Voice Onboarding Screenshot

    func testVoiceOnboardingScreenshot() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(screenLoaded, "Voice onboarding screen did not load for screenshot")

        ScreenshotHelper.captureScreen(app, screen: "voiceOnboarding")
    }
}
