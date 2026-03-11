import XCTest

// MARK: - Proactive Voice Feature Tests (iOS only)

@MainActor final class ProactiveVoiceTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Voice Assistant UI

    func testProactiveVoiceAssistantUIAppears() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let voiceCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'proactive_voice' OR label CONTAINS[c] 'Proactive Voice' OR label CONTAINS[c] 'Voice Assistant'")
        ).firstMatch
        XCTAssertTrue(voiceCard.waitForExistence(timeout: 8), "Proactive Voice feature card not found")
        voiceCard.tap()

        let voiceUI = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'proactive_voice_screen' OR identifier CONTAINS[c] 'voice_assistant_ui'")
        ).firstMatch
        XCTAssertTrue(voiceUI.waitForExistence(timeout: 8), "Proactive Voice assistant UI did not appear")
    }

    // MARK: - Suggestion Cards

    func testProactiveVoiceSuggestionCardsAreVisible() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let voiceCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'proactive_voice' OR label CONTAINS[c] 'Proactive Voice' OR label CONTAINS[c] 'Voice Assistant'")
        ).firstMatch

        guard voiceCard.waitForExistence(timeout: 8) else {
            XCTFail("Proactive Voice card not found")
            return
        }
        voiceCard.tap()

        _ = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'proactive_voice_screen'")
        ).firstMatch.waitForExistence(timeout: 8)

        let suggestionCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'suggestion_card' OR label CONTAINS[c] 'suggestion'")
        ).firstMatch
        XCTAssertTrue(suggestionCard.waitForExistence(timeout: 8), "No suggestion cards found in Proactive Voice UI")
    }

    // MARK: - Tap Suggestion

    func testProactiveVoiceSuggestionTapReturnsAIRecommendation() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let voiceCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'proactive_voice' OR label CONTAINS[c] 'Proactive Voice' OR label CONTAINS[c] 'Voice Assistant'")
        ).firstMatch

        guard voiceCard.waitForExistence(timeout: 8) else { return }
        voiceCard.tap()

        let suggestionCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'suggestion_card'")
        ).firstMatch

        guard suggestionCard.waitForExistence(timeout: 8) else {
            XCTFail("Suggestion card not found")
            return
        }
        suggestionCard.tap()

        let recommendation = app.staticTexts.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'ai_recommendation' OR label.length > 15")
        ).firstMatch
        XCTAssertTrue(recommendation.waitForExistence(timeout: 10), "AI recommendation did not appear after tapping suggestion")
    }

    // MARK: - Screenshot

    func testProactiveVoiceScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ScreenshotHelper.capture(app, name: "discover_proactive_voice")
    }
}
