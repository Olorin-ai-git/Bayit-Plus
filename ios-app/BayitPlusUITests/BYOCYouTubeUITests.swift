import XCTest

final class BYOCYouTubeUITests: XCTestCase {
    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "settings")
    }

    // MARK: - Navigate to BYOC Sources

    @MainActor
    private func navigateToBYOCSources() -> Bool {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)

        let scrollView = app.scrollViews.firstMatch
        guard scrollView.waitForExistence(timeout: 5) else { return false }

        let connectedSourcesRow = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Connected Sources' OR label CONTAINS[c] 'Content Sources'")
        ).firstMatch

        if !connectedSourcesRow.waitForExistence(timeout: 3) {
            scrollView.swipeUp()
            guard connectedSourcesRow.waitForExistence(timeout: 3) else { return false }
        }

        connectedSourcesRow.tap()
        return app.scrollViews.firstMatch.waitForExistence(timeout: 5)
    }

    // MARK: - Fix #1: YouTube Auth Sheet Opens Without Crash

    @MainActor
    func testYouTubeAuthSheetOpensWithoutCrash() {
        guard navigateToBYOCSources() else {
            XCTFail("Could not navigate to BYOC sources")
            return
        }

        let youtubeButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'YouTube'")
        ).firstMatch

        let scrollView = app.scrollViews.firstMatch
        if !youtubeButton.waitForExistence(timeout: 3) {
            scrollView.swipeUp()
        }

        guard youtubeButton.waitForExistence(timeout: 3) else {
            XCTFail("Add YouTube button not found")
            return
        }

        youtubeButton.tap()

        let sheetContent = app.otherElements.firstMatch
        XCTAssertTrue(
            sheetContent.waitForExistence(timeout: 5),
            "YouTube auth sheet did not appear"
        )

        let requestingText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'Requesting' OR label CONTAINS[c] 'code'")
        ).firstMatch

        let codeOrLoading = requestingText.waitForExistence(timeout: 8)
            || app.progressIndicators.firstMatch.exists

        XCTAssertTrue(
            codeOrLoading,
            "Sheet did not show loading state or device code"
        )

        XCTAssertTrue(app.state != .notRunning, "App crashed on YouTube auth sheet open")
    }

    // MARK: - Fix #1: Device Code Displays Correctly

    @MainActor
    func testDeviceCodeDisplaysWhenReceived() {
        guard navigateToBYOCSources() else {
            XCTFail("Could not navigate to BYOC sources")
            return
        }

        let youtubeButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'YouTube'")
        ).firstMatch

        if !youtubeButton.waitForExistence(timeout: 3) {
            app.scrollViews.firstMatch.swipeUp()
        }

        guard youtubeButton.waitForExistence(timeout: 3) else {
            XCTFail("Add YouTube button not found")
            return
        }

        youtubeButton.tap()

        _ = app.otherElements.firstMatch.waitForExistence(timeout: 5)

        let waitingText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'Waiting' OR label CONTAINS[c] 'authorization'")
        ).firstMatch

        let codeText = app.staticTexts.matching(
            NSPredicate(format: "label MATCHES '.*[A-Z]+-[A-Z]+-[A-Z]+.*'")
        ).firstMatch

        let errorText = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'error' OR label CONTAINS[c] 'failed'")
        ).firstMatch

        let gotResponse = waitingText.waitForExistence(timeout: 15)
            || codeText.waitForExistence(timeout: 1)
            || errorText.waitForExistence(timeout: 1)

        XCTAssertTrue(gotResponse, "No response from YouTube device code request within 15s")
        XCTAssertTrue(app.state != .notRunning, "App crashed during device code flow")
    }

    // MARK: - Fix #12: Cancel Button Dismisses Sheet

    @MainActor
    func testCancelButtonDismissesSheet() {
        guard navigateToBYOCSources() else {
            XCTFail("Could not navigate to BYOC sources")
            return
        }

        let youtubeButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'YouTube'")
        ).firstMatch

        if !youtubeButton.waitForExistence(timeout: 3) {
            app.scrollViews.firstMatch.swipeUp()
        }

        guard youtubeButton.waitForExistence(timeout: 3) else {
            XCTFail("Add YouTube button not found")
            return
        }

        youtubeButton.tap()
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 5)

        let cancelButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Cancel'")
        ).firstMatch

        guard cancelButton.waitForExistence(timeout: 5) else {
            XCTFail("Cancel button not found in YouTube auth sheet")
            return
        }

        cancelButton.tap()

        let sheetDismissed = youtubeButton.waitForExistence(timeout: 5)
        XCTAssertTrue(sheetDismissed, "Sheet did not dismiss after cancel tap")
        XCTAssertTrue(app.state != .notRunning, "App crashed after sheet dismiss")
    }

    // MARK: - Fix #12: Swipe Dismiss Cancels Poll Task

    @MainActor
    func testSwipeDismissDoesNotCrash() {
        guard navigateToBYOCSources() else {
            XCTFail("Could not navigate to BYOC sources")
            return
        }

        let youtubeButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'YouTube'")
        ).firstMatch

        if !youtubeButton.waitForExistence(timeout: 3) {
            app.scrollViews.firstMatch.swipeUp()
        }

        guard youtubeButton.waitForExistence(timeout: 3) else {
            XCTFail("Add YouTube button not found")
            return
        }

        youtubeButton.tap()

        _ = app.progressIndicators.firstMatch.waitForExistence(timeout: 5)
            || app.staticTexts.matching(
                NSPredicate(format: "label CONTAINS[c] 'code'")
            ).firstMatch.waitForExistence(timeout: 5)

        app.swipeDown()

        let sheetDismissed = youtubeButton.waitForExistence(timeout: 5)
        XCTAssertTrue(sheetDismissed, "Sheet did not dismiss after swipe-down")
        XCTAssertTrue(app.state != .notRunning, "App crashed after swipe dismiss")
    }

    // MARK: - BYOC Source List Loads

    @MainActor
    func testBYOCSourceListLoads() {
        guard navigateToBYOCSources() else {
            XCTFail("Could not navigate to BYOC sources")
            return
        }

        let hasContent = app.staticTexts.count > 0
        XCTAssertTrue(hasContent, "BYOC source list has no content")

        let youtubeButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'YouTube'")
        ).firstMatch

        let iptvButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'IPTV'")
        ).firstMatch

        let hasSourceButtons = youtubeButton.waitForExistence(timeout: 3)
            || iptvButton.waitForExistence(timeout: 1)

        XCTAssertTrue(hasSourceButtons, "No add-source buttons found on BYOC list")
    }
}
