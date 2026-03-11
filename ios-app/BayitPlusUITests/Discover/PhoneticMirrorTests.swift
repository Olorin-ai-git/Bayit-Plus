import XCTest

// MARK: - Phonetic Mirror Feature Tests (iOS only)

@MainActor final class PhoneticMirrorTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Navigation

    private func navigateToPhoneticMirror() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let featureCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'phonetic_mirror' OR label CONTAINS[c] 'Phonetic Mirror' OR label CONTAINS[c] 'phonetic'")
        ).firstMatch
        XCTAssertTrue(featureCard.waitForExistence(timeout: 8), "Phonetic Mirror feature card not found")
        featureCard.tap()
    }

    // MARK: - Boundary Test

    func testPhoneticMirrorBoundaryMicPromptOrUnavailable() {
        navigateToPhoneticMirror()

        let featureScreen = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'phonetic_mirror_screen'")
        ).firstMatch
        XCTAssertTrue(featureScreen.waitForExistence(timeout: 8), "Phonetic Mirror screen did not load")

        let micPromptOrState = AudioInjectionHelper.verifyMicPermissionPrompt(app)
        XCTAssertTrue(micPromptOrState, "Expected mic permission prompt or unavailable state for Phonetic Mirror")

        AudioInjectionHelper.dismissMicPermissionPrompt(app)
        ScreenshotHelper.capture(app, name: "discover_phonetic_mirror_boundary")
    }

    // MARK: - Synthetic Audio

    func testPhoneticMirrorWithSyntheticAudioReturnsPronunciationScore() {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
        AudioInjectionHelper.injectAudio(app, sample: .hebrewPhrase)

        navigateToPhoneticMirror()

        let recordButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'record' OR label CONTAINS[c] 'record' OR label CONTAINS[c] 'speak'")
        ).firstMatch
        XCTAssertTrue(recordButton.waitForExistence(timeout: 8), "Record button not found in Phonetic Mirror")
        recordButton.tap()

        let scoreVisible = AudioInjectionHelper.verifyPronunciationScore(app)
        XCTAssertTrue(scoreVisible, "Pronunciation score not returned after synthetic audio injection")

        ScreenshotHelper.capture(app, name: "discover_phonetic_mirror_score")
    }
}
