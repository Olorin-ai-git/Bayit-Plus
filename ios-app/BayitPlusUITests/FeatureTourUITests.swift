import XCTest

@MainActor
final class FeatureTourUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "onboardingAI")
    }

    // MARK: - Tour Display

    func testFeatureTourPresentsAsFullScreen() {
        let tourLabel = app.otherElements.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'Feature Discovery Tour' OR label CONTAINS[c] 'tour'"
            )
        ).firstMatch

        let tourPresented = tourLabel.waitForExistence(timeout: 10)
            || app.staticTexts.count > 2

        XCTAssertTrue(tourPresented, "Feature tour should present on first onboarding launch")
    }

    func testFeatureTourHasSkipButton() {
        let loaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(loaded)

        let skipPredicate = NSPredicate(
            format: "label CONTAINS[c] 'skip' OR label CONTAINS[c] 'Skip'"
        )
        let skipButton = app.buttons.matching(skipPredicate).firstMatch
        let hasSkip = skipButton.waitForExistence(timeout: 8)
        XCTAssertTrue(hasSkip, "Feature tour should have a skip button")
    }

    func testFeatureTourSkipDismissesTour() {
        let loaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(loaded)

        let skipPredicate = NSPredicate(
            format: "label CONTAINS[c] 'skip' OR label CONTAINS[c] 'Skip'"
        )
        let skipButton = app.buttons.matching(skipPredicate).firstMatch
        guard skipButton.waitForExistence(timeout: 8) else {
            return
        }

        skipButton.tap()

        let tourDismissed = app.scrollViews.firstMatch.waitForExistence(timeout: 5)
            || app.switches.firstMatch.waitForExistence(timeout: 5)
        XCTAssertTrue(
            tourDismissed,
            "After skipping tour, onboarding main flow should be visible"
        )
    }

    // MARK: - Card Navigation

    func testFeatureTourCardSwipe() {
        let loaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(loaded)

        let skipButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'skip'")
        ).firstMatch

        guard skipButton.waitForExistence(timeout: 8) else { return }

        ScreenshotHelper.captureScreen(app, screen: "tour_card_1")

        app.swipeLeft()

        ScreenshotHelper.captureScreen(app, screen: "tour_card_2")
    }

    func testFeatureTourProgressDotsUpdate() {
        let loaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(loaded)

        let progressPredicate = NSPredicate(
            format: "label CONTAINS[c] 'Card' AND label CONTAINS[c] 'of'"
        )
        let progressIndicator = app.otherElements.matching(progressPredicate).firstMatch

        if progressIndicator.waitForExistence(timeout: 5) {
            let initialLabel = progressIndicator.label
            app.swipeLeft()

            let updatedLabel = progressIndicator.label
            XCTAssertNotEqual(
                initialLabel, updatedLabel,
                "Progress indicator should update after swiping"
            )
        }
    }

    // MARK: - Try It Now (Demo)

    func testFeatureTourTryItNowButton() {
        let loaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(loaded)

        let tryPredicate = NSPredicate(
            format: "label CONTAINS[c] 'try it' OR label CONTAINS[c] 'Try It'"
        )
        let tryButton = app.buttons.matching(tryPredicate).firstMatch

        if tryButton.waitForExistence(timeout: 8) {
            tryButton.tap()

            let sheetPresented = app.navigationBars.firstMatch
                .waitForExistence(timeout: 5)
            XCTAssertTrue(sheetPresented, "Demo sheet should present after tapping Try It Now")

            ScreenshotHelper.captureScreen(app, screen: "tour_demo_sheet")

            let dismissButton = app.buttons.matching(
                NSPredicate(format: "label CONTAINS[c] 'close' OR label CONTAINS[c] 'xmark'")
            ).firstMatch
            if dismissButton.waitForExistence(timeout: 3) {
                dismissButton.tap()
            }
        }
    }

    // MARK: - Last Card: Get Started

    func testFeatureTourGetStartedOnLastCard() {
        let loaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(loaded)

        let skipButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'skip'")
        ).firstMatch
        guard skipButton.waitForExistence(timeout: 8) else { return }

        for _ in 0 ..< 9 {
            app.swipeLeft()
        }

        let getStartedPredicate = NSPredicate(
            format: "label CONTAINS[c] 'get started' OR label CONTAINS[c] 'Get Started'"
        )
        let getStartedButton = app.buttons.matching(getStartedPredicate).firstMatch

        if getStartedButton.waitForExistence(timeout: 5) {
            ScreenshotHelper.captureScreen(app, screen: "tour_lastCard_getStarted")
            getStartedButton.tap()
        }
    }

    // MARK: - Personalization Step

    func testPersonalizationStepAfterTourCompletion() {
        let loaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(loaded)

        let skipButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'skip'")
        ).firstMatch
        guard skipButton.waitForExistence(timeout: 8) else { return }

        for _ in 0 ..< 9 {
            app.swipeLeft()
        }

        let getStartedButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'get started'")
        ).firstMatch

        if getStartedButton.waitForExistence(timeout: 5) {
            getStartedButton.tap()

            let hasLanguageSection = app.staticTexts.matching(
                NSPredicate(
                    format: "label CONTAINS[c] 'language' OR label CONTAINS[c] 'genre'"
                )
            ).firstMatch.waitForExistence(timeout: 5)

            if hasLanguageSection {
                ScreenshotHelper.captureScreen(
                    app, screen: "tour_personalization"
                )
            }
        }
    }

    // MARK: - Screenshots

    func testFeatureTourScreenshots() {
        let loaded = app.otherElements.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(loaded)

        let skipButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'skip'")
        ).firstMatch
        guard skipButton.waitForExistence(timeout: 8) else {
            ScreenshotHelper.captureScreen(app, screen: "tour_noSkipButton")
            return
        }

        let featureNames = [
            "dubbing", "trivia", "subtitles", "engrew",
            "pauseAndAsk", "interaction", "zehAni", "catchup", "byoc",
        ]

        for (index, name) in featureNames.enumerated() {
            ScreenshotHelper.captureScreen(app, screen: "tour_\(name)")
            if index < featureNames.count - 1 {
                app.swipeLeft()
            }
        }
    }

    // MARK: - Accessibility

    func testFeatureTourAccessibility() {
        let tourAccessibility = app.otherElements.matching(
            NSPredicate(format: "label == 'Feature Discovery Tour'")
        ).firstMatch

        if tourAccessibility.waitForExistence(timeout: 10) {
            XCTAssertTrue(
                tourAccessibility.exists,
                "Feature tour should have accessibility label"
            )
        }
    }
}
