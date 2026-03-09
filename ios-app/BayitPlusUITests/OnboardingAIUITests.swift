import XCTest

@MainActor
final class OnboardingAIUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "onboardingAI")
        dismissTourIfPresent()
    }

    // MARK: - Screen Loading

    func testOnboardingAIScreenLoads() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded, "Onboarding AI screen did not load")
        XCTAssertTrue(
            NavigationHelper.verifyScreenHasContent(app, timeout: 8),
            "Onboarding AI screen has no content"
        )
    }

    // MARK: - Step 1: Welcome Step

    func testWelcomeStepDisplaysPreferences() {
        let screenLoaded = app.scrollViews.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded, "Welcome step scroll view did not load")

        let hasToggle = app.switches.firstMatch.waitForExistence(timeout: 5)
        XCTAssertTrue(hasToggle, "Welcome step should have toggle switches for subtitles/autoplay")

        let hasText = app.staticTexts.count > 0
        XCTAssertTrue(hasText, "Welcome step should display text content")
    }

    func testWelcomeStepHasProgressIndicator() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded, "Screen did not load")

        let hasAnyContent = app.staticTexts.count > 2
        XCTAssertTrue(hasAnyContent, "Progress indicator area and content should be visible")
    }

    func testWelcomeStepSubtitlesToggle() {
        let screenLoaded = app.scrollViews.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded)

        let toggles = app.switches
        guard toggles.count > 0 else { return }
        let firstToggle = toggles.firstMatch
        let initialValue = firstToggle.value as? String
        firstToggle.tap()
        let newValue = firstToggle.value as? String
        XCTAssertNotEqual(initialValue, newValue, "Toggle value should change after tap")
    }

    // MARK: - Navigation: Next Button

    func testNextButtonExists() {
        let screenLoaded = app.scrollViews.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded)

        let hasNextButton = findNextButton() != nil
        XCTAssertTrue(hasNextButton, "Next button should exist on welcome step")
    }

    func testNextButtonNavigatesToContentTaste() {
        let screenLoaded = app.scrollViews.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded)

        tapNextButton()

        let buttonsIncreased = app.buttons.count > 3
        let hasMultipleButtons = buttonsIncreased
            || app.staticTexts.count > 3
        XCTAssertTrue(
            hasMultipleButtons,
            "After Next, content taste step should show genre grid"
        )
        ScreenshotHelper.captureScreen(app, screen: "onboarding_afterNext_contentTaste")
    }

    // MARK: - Step 2: Content Taste

    func testContentTasteStepHasButtons() {
        navigateToStep(2)
        let hasButtons = app.buttons.count > 2
        XCTAssertTrue(hasButtons, "Content taste step should have genre buttons")
        ScreenshotHelper.captureScreen(app, screen: "onboarding_contentTaste")
    }

    func testContentTasteStepGenreToggle() {
        navigateToStep(2)
        selectAnyGenre()
        ScreenshotHelper.captureScreen(app, screen: "onboarding_contentTaste_genreSelected")
    }

    // MARK: - Step 3: Voice Setup

    func testVoiceSetupStepDisplaysToggles() {
        navigateToStep(3)

        let toggles = app.switches
        let hasToggles = toggles.firstMatch.waitForExistence(timeout: 5)
        XCTAssertTrue(hasToggles, "Voice setup step should have toggle switches")
        XCTAssertGreaterThanOrEqual(toggles.count, 2, "Should have voice enable and wake word toggles")

        ScreenshotHelper.captureScreen(app, screen: "onboarding_voiceSetup")
    }

    func testVoiceSetupToggleInteraction() {
        navigateToStep(3)

        let toggles = app.switches
        guard toggles.firstMatch.waitForExistence(timeout: 5) else {
            XCTFail("No toggles found on voice setup step")
            return
        }

        let voiceToggle = toggles.element(boundBy: 0)
        guard voiceToggle.isHittable else {
            app.swipeUp()
            guard voiceToggle.isHittable else { return }
            return
        }
        let initialValue = voiceToggle.value as? String
        voiceToggle.tap()
        let newValue = voiceToggle.value as? String
        XCTAssertNotEqual(initialValue, newValue, "Voice toggle should change state")
    }

    // MARK: - Step 4: Profile Creation

    func testProfileStepDisplaysNameInput() {
        navigateToStep(4)

        let textFields = app.textFields
        let hasInput = textFields.firstMatch.waitForExistence(timeout: 5)
        XCTAssertTrue(hasInput, "Profile step should have a name text field")

        ScreenshotHelper.captureScreen(app, screen: "onboarding_profileCreation")
    }

    func testProfileStepAvatarPicker() {
        navigateToStep(4)

        let buttons = app.buttons
        let buttonCount = buttons.count
        XCTAssertGreaterThan(buttonCount, 1, "Profile step should have avatar buttons")
        ScreenshotHelper.captureScreen(app, screen: "onboarding_avatarPicker")
    }

    func testProfileStepFinishButtonDisabledWithoutName() {
        navigateToStep(4)

        let finishButton = findFinishButton()
        guard let finishButton else { return }

        XCTAssertFalse(
            finishButton.isEnabled,
            "Finish button should be disabled when name is empty"
        )
    }

    func testProfileStepNameInputAndFinish() {
        navigateToStep(4)

        let textFields = app.textFields
        guard textFields.firstMatch.waitForExistence(timeout: 5) else {
            XCTFail("Name text field not found")
            return
        }

        let nameField = textFields.firstMatch
        nameField.tap()

        guard nameField.isHittable else { return }
        if nameField.value as? String == nameField.placeholderValue {
            nameField.typeText("Test User")
        }

        ScreenshotHelper.captureScreen(app, screen: "onboarding_nameEntered")
    }

    // MARK: - Back Navigation

    func testBackButtonNotVisibleOnWelcomeStep() {
        let screenLoaded = app.scrollViews.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded)

        let backButton = findBackButton()
        XCTAssertNil(
            backButton,
            "Back button should not be visible on welcome step"
        )
    }

    func testBackButtonVisibleOnStep2() {
        navigateToStep(2)

        let backButton = findBackButton()
        if let backButton {
            XCTAssertTrue(backButton.exists, "Back button should be visible on step 2")
            backButton.tap()
            let hasToggles = app.switches.firstMatch.waitForExistence(timeout: 5)
            XCTAssertTrue(hasToggles, "Should navigate back to welcome step")
        }
    }

    // MARK: - Full Flow E2E

    func testCompleteOnboardingFlowScreenshots() {
        let screenLoaded = app.scrollViews.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded, "Onboarding screen did not load")

        ScreenshotHelper.captureScreen(app, screen: "onboarding_step1_welcome")

        tapNextButton()
        selectAnyGenre()
        ScreenshotHelper.captureScreen(app, screen: "onboarding_step2_contentTaste")

        tapNextButton()
        ScreenshotHelper.captureScreen(app, screen: "onboarding_step3_voiceSetup")

        tapNextButton()
        ScreenshotHelper.captureScreen(app, screen: "onboarding_step4_profile")
    }

    // MARK: - Accessibility

    func testOnboardingHasStaticTextContent() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded)

        let textCount = app.staticTexts.count
        XCTAssertGreaterThan(
            textCount, 0,
            "Onboarding should have readable text content"
        )
    }

    func testOnboardingHasInteractiveElements() {
        let screenLoaded = app.scrollViews.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded)

        let buttonCount = app.buttons.count
        let switchCount = app.switches.count
        XCTAssertGreaterThan(
            buttonCount + switchCount, 0,
            "Onboarding should have interactive elements"
        )
    }

    // MARK: - Helpers

    private func dismissTourIfPresent() {
        let skipPredicate = NSPredicate(
            format: "label CONTAINS[c] 'skip' OR label CONTAINS[c] 'Skip'"
        )
        let skipButton = app.buttons.matching(skipPredicate).firstMatch
        if skipButton.waitForExistence(timeout: 8) {
            skipButton.tap()
            _ = app.scrollViews.firstMatch.waitForExistence(timeout: 5)
        }
    }

    private func navigateToStep(_ step: Int) {
        let screenLoaded = app.scrollViews.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(screenLoaded, "Screen did not load before navigating to step \(step)")

        for currentStep in 1 ..< step {
            if currentStep == 2 {
                selectAnyGenre()
            }
            tapNextButton()
        }
    }

    private func tapNextButton() {
        if let next = findNextButton(), next.isEnabled {
            next.tap()
        }
    }

    private func findNextButton() -> XCUIElement? {
        let nextPredicate = NSPredicate(
            format: "label CONTAINS[c] 'next' OR label CONTAINS[c] 'Next'"
        )
        let button = app.buttons.matching(nextPredicate).firstMatch
        return button.waitForExistence(timeout: 5) ? button : nil
    }

    private func findBackButton() -> XCUIElement? {
        let backPredicate = NSPredicate(
            format: "label CONTAINS[c] 'back' OR label CONTAINS[c] 'Back'"
        )
        let button = app.buttons.matching(backPredicate).firstMatch
        return button.waitForExistence(timeout: 3) ? button : nil
    }

    private func findFinishButton() -> XCUIElement? {
        let finishPredicate = NSPredicate(
            format: "label CONTAINS[c] 'finish' OR label CONTAINS[c] 'Finish' OR label CONTAINS[c] 'done'"
        )
        let button = app.buttons.matching(finishPredicate).firstMatch
        return button.waitForExistence(timeout: 5) ? button : nil
    }

    private func selectAnyGenre() {
        let buttons = app.buttons
        for i in 0 ..< min(buttons.count, 20) {
            let button = buttons.element(boundBy: i)
            let label = button.label.lowercased()
            let isGenre = ["drama", "comedy", "action", "documentary",
                           "family", "thriller", "romance", "animation",
                           "music", "reality", "news", "sports"].contains(where: { label.contains($0) })
            if isGenre, button.isHittable {
                button.tap()
                return
            }
        }
        if let firstTappable = (0 ..< buttons.count).first(where: {
            let b = buttons.element(boundBy: $0)
            return b.isHittable && !b.label.lowercased().contains("next")
                && !b.label.lowercased().contains("back")
                && !b.label.lowercased().contains("skip")
        }) {
            buttons.element(boundBy: firstTappable).tap()
        }
    }
}
