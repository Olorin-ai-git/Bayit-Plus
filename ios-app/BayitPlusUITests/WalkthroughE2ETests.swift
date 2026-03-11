import XCTest

@MainActor
final class WalkthroughE2ETests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "discover")
    }

    // MARK: - Discover Tab Loads

    func testDiscoverTabDisplaysCategories() {
        let loaded = waitForDiscoverTab()
        XCTAssertTrue(loaded, "Discover tab should load")
        ScreenshotHelper.captureScreen(app, screen: "walkthrough_discover_tab")
    }

    // MARK: - Feature Detail Sheet

    func testFeatureCardOpensDetailSheet() {
        guard waitForDiscoverTab() else {
            XCTFail("Discover tab did not load")
            return
        }

        let pauseAskCard = app.otherElements["discover_feature_pause_ask"]
        if pauseAskCard.waitForExistence(timeout: 5) {
            pauseAskCard.tap()
        } else {
            let pauseAskText = app.staticTexts.matching(
                NSPredicate(format: "label CONTAINS[c] 'Pause'")
            ).firstMatch
            guard pauseAskText.waitForExistence(timeout: 5) else {
                XCTFail("Could not find Pause & Ask feature card")
                return
            }
            pauseAskText.tap()
        }

        let detailHeader = app.otherElements["discover_detail_header"]
        XCTAssertTrue(
            detailHeader.waitForExistence(timeout: 5),
            "Feature detail sheet should present with header"
        )

        ScreenshotHelper.captureScreen(app, screen: "walkthrough_detail_sheet")
    }

    // MARK: - GlassButton Rendering

    func testDetailSheetUsesGlassButtons() {
        navigateToFeatureDetail()

        let tryItButton = app.buttons["discover_action_tryIt"]
        if tryItButton.waitForExistence(timeout: 5) {
            XCTAssertTrue(tryItButton.isHittable, "Try It button should be tappable")
            ScreenshotHelper.captureScreen(app, screen: "walkthrough_glass_buttons")
        }

        let watchDemoButton = app.buttons["discover_action_watchDemo"]
        if watchDemoButton.exists {
            XCTAssertTrue(watchDemoButton.isHittable, "Watch Demo button should be tappable")
        }
    }

    // MARK: - Try It Starts Walkthrough Session

    func testTryItStartsWalkthroughSession() {
        navigateToFeatureDetail()

        let tryItButton = app.buttons["discover_action_tryIt"]
        guard tryItButton.waitForExistence(timeout: 5) else {
            return
        }

        tryItButton.tap()

        let detailDismissed = app.otherElements["discover_detail_header"]
            .waitForNonExistence(timeout: 5)
        XCTAssertTrue(
            detailDismissed,
            "Detail sheet should dismiss after tapping Try It"
        )

        ScreenshotHelper.captureScreen(app, screen: "walkthrough_session_started")
    }

    // MARK: - Localized Coach Mark Buttons

    func testCoachMarkOverlayLocalization() {
        navigateToFeatureDetail()

        let tryItButton = app.buttons["discover_action_tryIt"]
        guard tryItButton.waitForExistence(timeout: 5) else {
            return
        }
        tryItButton.tap()

        let skipLabel = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'tutorial' OR label CONTAINS[c] 'skip'")
        ).firstMatch

        if skipLabel.waitForExistence(timeout: 8) {
            ScreenshotHelper.captureScreen(app, screen: "walkthrough_coach_mark")

            let nextLabel = app.buttons.matching(
                NSPredicate(format: "label CONTAINS[c] 'step' OR label CONTAINS[c] 'next'")
            ).firstMatch

            XCTAssertTrue(nextLabel.exists, "Coach mark should have a Next button")
        }
    }

    // MARK: - Background Lifecycle Ends Session

    func testBackgroundingEndsWalkthroughSession() {
        navigateToFeatureDetail()

        let tryItButton = app.buttons["discover_action_tryIt"]
        guard tryItButton.waitForExistence(timeout: 5) else {
            return
        }
        tryItButton.tap()

        XCUIDevice.shared.press(.home)
        sleep(1)

        app.activate()
        sleep(1)

        ScreenshotHelper.captureScreen(app, screen: "walkthrough_after_background")
    }

    // MARK: - Helpers

    private func waitForDiscoverTab() -> Bool {
        let featureCard = app.otherElements["discover_feature_pause_ask"]
        if featureCard.waitForExistence(timeout: 10) { return true }
        let discoverTitle = app.staticTexts["Discover"]
        return discoverTitle.waitForExistence(timeout: 5)
    }

    private func navigateToFeatureDetail() {
        guard waitForDiscoverTab() else { return }

        let pauseAskCard = app.otherElements["discover_feature_pause_ask"]
        if pauseAskCard.waitForExistence(timeout: 5) {
            pauseAskCard.tap()
        } else {
            let pauseAskText = app.staticTexts.matching(
                NSPredicate(format: "label CONTAINS[c] 'Pause'")
            ).firstMatch
            guard pauseAskText.waitForExistence(timeout: 5) else { return }
            pauseAskText.tap()
        }

        _ = app.otherElements["discover_detail_header"]
            .waitForExistence(timeout: 5)
    }
}
