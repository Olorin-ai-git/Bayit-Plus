import XCTest

@MainActor
final class AICompanionTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Plex

    func testFeatureWithPlexContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ContentSourceHelper.navigateToVODContent(app, source: .plex)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (Plex)")

        openCompanionPanel()

        verifyCompanionTabsVisible()
        ScreenshotHelper.capture(app, name: "ai_companion_plex_panel")

        testChatTab(source: "Plex")
        testQuizTab(source: "Plex")
    }

    // MARK: - YouTube

    func testFeatureWithYouTubeContent() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ContentSourceHelper.navigateToVODContent(app, source: .youtube)
        ContentSourceHelper.playFirstVODItem(app)
        XCTAssertTrue(ContentSourceHelper.waitForPlayerReady(app), "Player did not become ready (YouTube)")

        openCompanionPanel()

        verifyCompanionTabsVisible()
        ScreenshotHelper.capture(app, name: "ai_companion_youtube_panel")

        testChatTab(source: "YouTube")
        testQuizTab(source: "YouTube")
    }

    // MARK: - Chat

    private func testChatTab(source: String) {
        let chatTab = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'chat' OR label CONTAINS[c] 'שיחה'")
        ).firstMatch
        if chatTab.waitForExistence(timeout: 5) {
            chatTab.tap()
        }

        let inputField = app.textFields.firstMatch
        XCTAssertTrue(inputField.waitForExistence(timeout: 5), "Chat input not found (\(source))")
        inputField.tap()
        inputField.typeText("What just happened?")
        app.keyboards.buttons["return"].tap()

        let aiReply = app.staticTexts.matching(
            NSPredicate(format: "label.length > 20")
        ).firstMatch
        let elapsed = ContentSourceHelper.measureResponseTime(
            action: { /* message already sent */ },
            waitForElement: aiReply,
            timeout: 10
        )
        XCTAssertTrue(aiReply.exists, "AI chat reply did not appear (\(source))")
        XCTAssertLessThan(elapsed, 10, "AI reply took too long (\(source)): \(elapsed)s")

        ScreenshotHelper.capture(app, name: "ai_companion_\(source.lowercased())_chat_reply")
    }

    // MARK: - Quiz

    private func testQuizTab(source: String) {
        let quizTab = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'quiz' OR label CONTAINS[c] 'חידון'")
        ).firstMatch
        XCTAssertTrue(quizTab.waitForExistence(timeout: 5), "Quiz tab not found (\(source))")
        quizTab.tap()

        let startButton = app.buttons.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'start' OR label CONTAINS[c] 'begin' " +
                    "OR label CONTAINS[c] 'התחל'"
            )
        ).firstMatch
        if startButton.waitForExistence(timeout: 5) {
            startButton.tap()
        }

        let questionText = app.staticTexts.matching(
            NSPredicate(format: "label.length > 10")
        ).firstMatch
        XCTAssertTrue(questionText.waitForExistence(timeout: 10), "Quiz question did not appear (\(source))")

        let answerOptions = app.buttons.matching(
            NSPredicate(
                format: "label.length > 1 AND NOT (label CONTAINS[c] 'start') " +
                    "AND NOT (label CONTAINS[c] 'chat') AND NOT (label CONTAINS[c] 'quiz')"
            )
        )
        XCTAssertGreaterThan(answerOptions.count, 0, "No quiz answer options found (\(source))")

        ScreenshotHelper.capture(app, name: "ai_companion_\(source.lowercased())_quiz")
    }

    // MARK: - Helpers

    private func openCompanionPanel() {
        let companionButton = app.buttons.matching(
            NSPredicate(
                format: "label CONTAINS[c] 'companion' OR label CONTAINS[c] 'AI' " +
                    "OR label CONTAINS[c] 'assistant' OR label CONTAINS[c] 'עוזר'"
            )
        ).firstMatch

        if companionButton.waitForExistence(timeout: 5) {
            companionButton.tap()
        } else {
            app.tap()
            let revealed = app.buttons.matching(
                NSPredicate(
                    format: "label CONTAINS[c] 'companion' OR label CONTAINS[c] 'assistant' " +
                        "OR label CONTAINS[c] 'עוזר'"
                )
            ).firstMatch
            if revealed.waitForExistence(timeout: 3) {
                revealed.tap()
            }
        }
    }

    private func verifyCompanionTabsVisible() {
        let chatTab = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'chat' OR label CONTAINS[c] 'שיחה'")
        ).firstMatch
        let quizTab = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'quiz' OR label CONTAINS[c] 'חידון'")
        ).firstMatch

        XCTAssertTrue(chatTab.waitForExistence(timeout: 8), "Chat tab not found in AI companion panel")
        XCTAssertTrue(quizTab.waitForExistence(timeout: 5), "Quiz tab not found in AI companion panel")
    }
}
