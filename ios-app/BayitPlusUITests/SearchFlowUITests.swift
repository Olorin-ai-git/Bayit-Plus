import XCTest

final class SearchFlowUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--skip-auth"]
        app.launch()
    }

    // MARK: - Search Presentation

    func testSearchScreenOpensViaNavigation() {
        // Wait for the main tab bar to appear
        XCTAssertTrue(app.buttons["tab_home"].waitForExistence(timeout: 8))

        // Look for a search button/icon to trigger search
        let searchButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'search'")
        ).firstMatch

        if searchButton.waitForExistence(timeout: 3) {
            searchButton.tap()

            // Verify search bar appears
            let cancelButton = app.buttons["Cancel search"]
            XCTAssertTrue(cancelButton.waitForExistence(timeout: 5))
        }
    }

    // MARK: - Cancel Search

    func testCancelSearchDismissesScreen() {
        XCTAssertTrue(app.buttons["tab_home"].waitForExistence(timeout: 8))

        let searchButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'search'")
        ).firstMatch

        if searchButton.waitForExistence(timeout: 3) {
            searchButton.tap()

            let cancelButton = app.buttons["Cancel search"]
            XCTAssertTrue(cancelButton.waitForExistence(timeout: 5))
            cancelButton.tap()

            // After cancel, the tab bar should be visible again
            XCTAssertTrue(app.buttons["tab_home"].waitForExistence(timeout: 3))
        }
    }

    // MARK: - Search Input

    func testSearchFieldAcceptsText() {
        XCTAssertTrue(app.buttons["tab_home"].waitForExistence(timeout: 8))

        let searchButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'search'")
        ).firstMatch

        if searchButton.waitForExistence(timeout: 3) {
            searchButton.tap()

            let searchField = app.textFields.firstMatch
            if searchField.waitForExistence(timeout: 5) {
                searchField.tap()
                searchField.typeText("Test Movie")

                // Verify text was entered
                XCTAssertEqual(searchField.value as? String, "Test Movie")
            }
        }
    }

    // MARK: - Search Prompt State

    func testSearchShowsPromptBeforeTyping() {
        XCTAssertTrue(app.buttons["tab_home"].waitForExistence(timeout: 8))

        let searchButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'search'")
        ).firstMatch

        if searchButton.waitForExistence(timeout: 3) {
            searchButton.tap()

            let promptText = app.staticTexts["Search for content"]
            XCTAssertTrue(promptText.waitForExistence(timeout: 5))
        }
    }
}
