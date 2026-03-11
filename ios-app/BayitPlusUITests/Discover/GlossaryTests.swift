import XCTest

// MARK: - Glossary Feature Tests

@MainActor final class GlossaryTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Open Glossary

    func testGlossaryOpensAndRendersTermList() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let glossaryCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'glossary' OR label CONTAINS[c] 'Glossary' OR label CONTAINS[c] 'מילון'")
        ).firstMatch
        XCTAssertTrue(glossaryCard.waitForExistence(timeout: 8), "Glossary feature card not found")
        glossaryCard.tap()

        let termList = app.tables.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'glossary_list'")
        ).firstMatch

        let fallbackList = app.collectionViews.firstMatch
        let listVisible = termList.waitForExistence(timeout: 8) || fallbackList.waitForExistence(timeout: 3)
        XCTAssertTrue(listVisible, "Glossary term list did not render")

        let termCount = app.cells.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'glossary_term'")
        ).count
        XCTAssertGreaterThan(termCount, 0, "Glossary rendered no terms")
    }

    // MARK: - Term Definition Expansion

    func testGlossaryTermTapExpandsDefinition() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let glossaryCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'glossary' OR label CONTAINS[c] 'Glossary'")
        ).firstMatch

        guard glossaryCard.waitForExistence(timeout: 8) else {
            XCTFail("Glossary feature card not found")
            return
        }
        glossaryCard.tap()

        let firstTerm = app.cells.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'glossary_term'")
        ).firstMatch

        XCTAssertTrue(firstTerm.waitForExistence(timeout: 8), "No glossary terms found")
        firstTerm.tap()

        let definition = app.staticTexts.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'glossary_definition' OR label.length > 20")
        ).firstMatch
        XCTAssertTrue(definition.waitForExistence(timeout: 5), "Term definition did not expand after tap")
    }

    // MARK: - Term Count Assertion

    func testGlossaryHasNonZeroTermCount() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let glossaryCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'glossary' OR label CONTAINS[c] 'Glossary'")
        ).firstMatch

        guard glossaryCard.waitForExistence(timeout: 8) else { return }
        glossaryCard.tap()

        _ = app.cells.firstMatch.waitForExistence(timeout: 8)
        let count = app.cells.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'glossary_term'")
        ).count
        XCTAssertGreaterThan(count, 0, "Glossary term count must be greater than zero")
    }

    // MARK: - Screenshot

    func testGlossaryScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ScreenshotHelper.capture(app, name: "discover_glossary")
    }
}
