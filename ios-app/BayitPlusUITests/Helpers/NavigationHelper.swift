import XCTest

@MainActor
enum NavigationHelper {
    static let defaultTimeout: TimeInterval = 8

    // MARK: - Tab Navigation

    static func waitForTabBar(_ app: XCUIApplication, timeout: TimeInterval = defaultTimeout) -> Bool {
        app.buttons["tab_home"].waitForExistence(timeout: timeout)
    }

    /// Tab name mapping from display names to accessibility identifiers
    private static let tabIdentifiers: [String: String] = [
        "Home": "tab_home",
        "Live": "tab_liveTV",
        "Live TV": "tab_liveTV",
        "VOD": "tab_vod",
        "Listen": "tab_podcasts",
        "Podcasts": "tab_podcasts",
        "Search": "tab_search",
        "Downloads": "tab_downloads",
    ]

    static func switchToTab(_ app: XCUIApplication, tab: String, timeout: TimeInterval = defaultTimeout) {
        let identifier = tabIdentifiers[tab] ?? "tab_\(tab.lowercased())"
        let tabButton = app.buttons[identifier]
        XCTAssertTrue(tabButton.waitForExistence(timeout: timeout), "Tab '\(tab)' not found (id: \(identifier))")
        tabButton.tap()
    }

    // MARK: - Profile Menu

    static func openProfileMenu(_ app: XCUIApplication, timeout: TimeInterval = defaultTimeout) {
        let profileButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'profile'")
        ).firstMatch

        XCTAssertTrue(profileButton.waitForExistence(timeout: timeout), "Profile button not found")
        profileButton.tap()
    }

    static func navigateToProfileRow(_ app: XCUIApplication, row: String, timeout: TimeInterval = 5) {
        let rowButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", row)
        ).firstMatch

        if rowButton.waitForExistence(timeout: timeout) {
            rowButton.tap()
        } else {
            let staticRow = app.staticTexts.matching(
                NSPredicate(format: "label CONTAINS[c] %@", row)
            ).firstMatch
            XCTAssertTrue(staticRow.waitForExistence(timeout: 3), "Row '\(row)' not found")
            staticRow.tap()
        }
    }

    // MARK: - Settings Navigation

    static func navigateToSettings(_ app: XCUIApplication) {
        XCTAssertTrue(waitForTabBar(app), "Tab bar not visible")
        openProfileMenu(app)
        navigateToProfileRow(app, row: "Settings")
    }

    static func navigateToSettingsRow(_ app: XCUIApplication, row: String) {
        navigateToSettings(app)
        navigateToProfileRow(app, row: row)
    }

    // MARK: - Back Navigation

    static func tapBackButton(_ app: XCUIApplication, timeout: TimeInterval = 3) {
        let backButton = app.navigationBars.buttons.firstMatch
        if backButton.waitForExistence(timeout: timeout) {
            backButton.tap()
        }
    }

    // MARK: - Content Verification

    static func verifyScrollViewLoads(_ app: XCUIApplication, timeout: TimeInterval = 5) -> Bool {
        app.scrollViews.firstMatch.waitForExistence(timeout: timeout)
    }

    static func verifyScreenHasContent(_ app: XCUIApplication, timeout: TimeInterval = 5) -> Bool {
        let hasScrollView = app.scrollViews.firstMatch.waitForExistence(timeout: timeout)
        let hasCollectionView = app.collectionViews.firstMatch.exists
        let hasStaticText = app.staticTexts.count > 0
        return hasScrollView || hasCollectionView || hasStaticText
    }
}
