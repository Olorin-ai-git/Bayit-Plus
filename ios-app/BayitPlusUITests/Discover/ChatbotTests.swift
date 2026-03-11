import XCTest

// MARK: - Chatbot Feature Tests

@MainActor final class ChatbotTests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchApp()
    }

    // MARK: - Open Chatbot

    func testChatbotOpensFromDiscover() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let chatCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chatbot' OR label CONTAINS[c] 'Chat' OR label CONTAINS[c] 'AI Assistant'")
        ).firstMatch
        XCTAssertTrue(chatCard.waitForExistence(timeout: 8), "Chatbot feature card not found")
        chatCard.tap()

        let chatUI = app.otherElements.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chatbot_screen' OR identifier CONTAINS[c] 'chat_ui'")
        ).firstMatch
        XCTAssertTrue(chatUI.waitForExistence(timeout: 8), "Chatbot UI did not appear")
    }

    // MARK: - Send Message and Verify Response

    func testChatbotSendMessageReturnsContextualResponse() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let chatCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chatbot' OR label CONTAINS[c] 'Chat' OR label CONTAINS[c] 'AI Assistant'")
        ).firstMatch

        guard chatCard.waitForExistence(timeout: 8) else {
            XCTFail("Chatbot card not found")
            return
        }
        chatCard.tap()

        let inputField = app.textFields.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chat_input' OR placeholderValue CONTAINS[c] 'message' OR placeholderValue CONTAINS[c] 'ask'")
        ).firstMatch

        XCTAssertTrue(inputField.waitForExistence(timeout: 8), "Chat input field not found")
        inputField.tap()
        inputField.typeText("What channels are available?")

        let sendButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chat_send' OR label CONTAINS[c] 'Send'")
        ).firstMatch
        XCTAssertTrue(sendButton.waitForExistence(timeout: 5), "Send button not found")
        sendButton.tap()

        let aiResponse = app.staticTexts.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chat_response' OR (label.length > 10 AND (label CONTAINS[c] 'channel' OR label CONTAINS[c] 'ערוץ' OR label CONTAINS[c] 'available' OR label CONTAINS[c] 'watch'))")
        ).firstMatch
        XCTAssertTrue(aiResponse.waitForExistence(timeout: 10), "AI response did not appear or was not contextually relevant")
    }

    // MARK: - Performance

    func testChatbotSendToResponseTime() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")

        let chatCard = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chatbot' OR label CONTAINS[c] 'Chat' OR label CONTAINS[c] 'AI Assistant'")
        ).firstMatch

        guard chatCard.waitForExistence(timeout: 8) else { return }
        chatCard.tap()

        let inputField = app.textFields.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chat_input' OR placeholderValue CONTAINS[c] 'message'")
        ).firstMatch

        guard inputField.waitForExistence(timeout: 8) else { return }
        inputField.tap()
        inputField.typeText("What channels are available?")

        let sendButton = app.buttons.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chat_send' OR label CONTAINS[c] 'Send'")
        ).firstMatch

        let aiResponse = app.staticTexts.matching(
            NSPredicate(format: "identifier CONTAINS[c] 'chat_response'")
        ).firstMatch

        let elapsed = ContentSourceHelper.measureResponseTime(
            action: { sendButton.tap() },
            waitForElement: aiResponse,
            timeout: 10
        )
        XCTAssertLessThan(elapsed, 10, "Chatbot send-to-response took longer than 10s: \(elapsed)s")
    }

    // MARK: - Screenshot

    func testChatbotScreenshot() {
        XCTAssertTrue(NavigationHelper.waitForTabBar(app), "Tab bar not visible")
        NavigationHelper.switchToTab(app, tab: "Discover")
        ScreenshotHelper.capture(app, name: "discover_chatbot")
    }
}
