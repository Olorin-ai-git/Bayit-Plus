import XCTest

// MARK: - Interactive Mission Feature Tests (iOS only)

@MainActor final class InteractiveMissionTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Navigation

    private func navigateToInteractiveMission() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let featureCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'interactive_mission' OR label CONTAINS[c] 'Interactive Mission' OR label CONTAINS[c] 'Mission'")
        ).firstMatch
        XCTAssertTrue(featureCard.waitForExistence(timeout: 8), "Interactive Mission feature card not found")
        featureCard.tap()
    }

    // MARK: - Boundary Test

    func testInteractiveMissionBoundaryBriefingRendersAndMicPrompts() {
        navigateToInteractiveMission()

        let briefing = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'mission_briefing' OR label CONTAINS[c] 'mission' OR label CONTAINS[c] 'briefing'")
        ).firstMatch
        XCTAssertTrue(briefing.waitForExistence(timeout: 8), "Mission briefing did not render")

        let acceptButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'mission_accept' OR label CONTAINS[c] 'Accept' OR label CONTAINS[c] 'Start'")
        ).firstMatch
        XCTAssertTrue(acceptButton.waitForExistence(timeout: 5), "Mission accept button not found")
        acceptButton.tap()

        let micPromptOrUI = AudioInjectionHelper.verifyMicPermissionPrompt(app)
            || AudioInjectionHelper.verifyRecordingUIAppears(app)
        XCTAssertTrue(micPromptOrUI, "Expected mic prompt or recording UI after accepting mission")

        AudioInjectionHelper.dismissMicPermissionPrompt(app)
        ScreenshotHelper.capture(app, name: "discover_interactive_mission_boundary")
    }

    // MARK: - Synthetic Audio

    func testInteractiveMissionWithSyntheticAudioProgressesToNextStep() {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
        AudioInjectionHelper.injectAudio(app, sample: .hebrewSentence)

        navigateToInteractiveMission()

        let acceptButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'mission_accept' OR label CONTAINS[c] 'Accept' OR label CONTAINS[c] 'Start'")
        ).firstMatch

        guard acceptButton.waitForExistence(timeout: 8) else {
            XCTFail("Mission accept button not found")
            return
        }
        acceptButton.tap()

        let recordButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'record' OR label CONTAINS[c] 'record' OR label CONTAINS[c] 'speak'")
        ).firstMatch

        guard recordButton.waitForExistence(timeout: 8) else {
            XCTFail("Record button not found after mission start")
            return
        }
        recordButton.tap()

        let nextStep = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'mission_step_2' OR label CONTAINS[c] 'step 2' OR label CONTAINS[c] 'next step' OR label CONTAINS[c] 'Well done'")
        ).firstMatch
        XCTAssertTrue(nextStep.waitForExistence(timeout: 10), "Mission did not progress to next step after synthetic audio")

        ScreenshotHelper.capture(app, name: "discover_interactive_mission_progress")
    }
}
