import XCTest

// MARK: - Talk Back Feature Tests (iOS only)

@MainActor final class TalkBackTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Navigation

    private func navigateToTalkBack() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let featureCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'talk_back' OR label CONTAINS[c] 'Talk Back' OR label CONTAINS[c] 'TalkBack'")
        ).firstMatch
        XCTAssertTrue(featureCard.waitForExistence(timeout: 8), "Talk Back feature card not found")
        featureCard.tap()
    }

    // MARK: - Boundary Test

    func testTalkBackBoundaryShowsMicPromptOrRecordingUI() {
        navigateToTalkBack()

        let featureScreen = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'talk_back_screen'")
        ).firstMatch
        XCTAssertTrue(featureScreen.waitForExistence(timeout: 8), "Talk Back screen did not load")

        let hasPromptOrUI = AudioInjectionHelper.verifyMicPermissionPrompt(app)
            || AudioInjectionHelper.verifyRecordingUIAppears(app)
        XCTAssertTrue(hasPromptOrUI, "Neither mic permission prompt nor recording UI appeared for Talk Back")

        AudioInjectionHelper.dismissMicPermissionPrompt(app)
        ScreenshotHelper.capture(app, name: "discover_talk_back_boundary")
    }

    // MARK: - Synthetic Audio

    func testTalkBackWithSyntheticAudioReturnsAIResponse() {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
        AudioInjectionHelper.injectAudio(app, sample: .hebrewSentence)

        navigateToTalkBack()

        let recordButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'record' OR label CONTAINS[c] 'record' OR label CONTAINS[c] 'speak' OR label CONTAINS[c] 'listen'")
        ).firstMatch
        XCTAssertTrue(recordButton.waitForExistence(timeout: 8), "Record button not found in Talk Back")
        recordButton.tap()

        let responseVisible = AudioInjectionHelper.verifyAIResponse(app)
        XCTAssertTrue(responseVisible, "AI conversational response not returned after synthetic audio injection")

        ScreenshotHelper.capture(app, name: "discover_talk_back_response")
    }
}
