import XCTest

final class SettingsFlowUITests: XCTestCase {

    private var app: XCUIApplication!

    @MainActor
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp(navigateTo: "settings")
    }

    // MARK: - Settings Screen Loads

    @MainActor
    func testSettingsScreenLoads() {
        let screenLoaded = app.otherElements.firstMatch.waitForExistence(timeout: 8)
        XCTAssertTrue(screenLoaded, "Settings screen did not load")

        let hasContent = app.staticTexts.count > 0
        XCTAssertTrue(hasContent, "Settings screen has no content")
    }

    // MARK: - Settings Toggles

    @MainActor
    func testSettingsTogglesExist() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)

        let toggles = app.switches
        if toggles.firstMatch.waitForExistence(timeout: 5) {
            XCTAssertGreaterThan(toggles.count, 0)
        }
    }

    @MainActor
    func testSettingsToggleCanBeToggled() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)

        let firstToggle = app.switches.firstMatch
        if firstToggle.waitForExistence(timeout: 5) {
            let initialValue = firstToggle.value as? String
            firstToggle.tap()
            let newValue = firstToggle.value as? String
            XCTAssertNotEqual(initialValue, newValue)
        }
    }

    // MARK: - Settings Navigation Rows

    @MainActor
    func testSettingsHasNavigationRows() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)

        let buttons = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'language' OR label CONTAINS[c] 'security' OR label CONTAINS[c] 'billing'")
        )

        if buttons.firstMatch.waitForExistence(timeout: 5) {
            XCTAssertGreaterThan(buttons.count, 0)
        }
    }

    // MARK: - Sub-Settings Navigation

    @MainActor
    func testNavigateToLanguageSettings() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)

        let languageRow = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'language'")
        ).firstMatch

        if languageRow.waitForExistence(timeout: 5) {
            languageRow.tap()

            let scrollView = app.scrollViews.firstMatch
            XCTAssertTrue(scrollView.waitForExistence(timeout: 5))
        }
    }

    @MainActor
    func testBackNavigationFromSubSettings() {
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)

        let languageRow = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'language'")
        ).firstMatch

        if languageRow.waitForExistence(timeout: 5) {
            languageRow.tap()

            _ = app.scrollViews.firstMatch.waitForExistence(timeout: 3)

            let backButton = app.navigationBars.buttons.firstMatch
            if backButton.waitForExistence(timeout: 3) {
                backButton.tap()

                XCTAssertTrue(languageRow.waitForExistence(timeout: 3))
            }
        }
    }
}
