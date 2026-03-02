import XCTest

@MainActor
final class ChessUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    func testChessBotGameWithChat() {
        let app = AppLaunchHelper.launchToRoute("chess")

        // Wait for the chess lobby to load
        let createButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Create New Game'")
        ).firstMatch
        XCTAssertTrue(createButton.waitForExistence(timeout: 10), "Chess lobby did not load")

        screenshot(app, name: "01-Chess-Lobby")

        // Tap "Play vs Bot" toggle
        let botButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Play vs Bot'")
        ).firstMatch
        if botButton.waitForExistence(timeout: 3) {
            botButton.tap()
            sleep(1)
            screenshot(app, name: "02-Play-vs-Bot-Selected")
        }

        // Tap Create New Game
        createButton.tap()

        // Wait for game to load
        let resignButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Resign'")
        ).firstMatch
        let gameLoaded = resignButton.waitForExistence(timeout: 15)

        screenshot(app, name: "03-Game-Loaded")

        guard gameLoaded else {
            XCTFail("Game did not load - Resign button not found")
            return
        }

        // Find chess board
        let chessBoard = app.otherElements["Chess board"]
        XCTAssertTrue(chessBoard.waitForExistence(timeout: 5), "Chess board not found")

        let boardFrame = chessBoard.frame
        let inset = boardFrame.width * 0.10
        let cellSize = (boardFrame.width - 2 * inset) / 8

        // Move 1: e2 -> e4
        tapSquare(board: chessBoard, inset: inset, cellSize: cellSize, col: 4, row: 6)
        sleep(1)
        screenshot(app, name: "04-Selected-e2")

        tapSquare(board: chessBoard, inset: inset, cellSize: cellSize, col: 4, row: 4)
        sleep(3)
        screenshot(app, name: "05-After-e4-Bot-Responded")

        // Move 2: d2 -> d4
        tapSquare(board: chessBoard, inset: inset, cellSize: cellSize, col: 3, row: 6)
        sleep(1)
        tapSquare(board: chessBoard, inset: inset, cellSize: cellSize, col: 3, row: 4)
        sleep(3)
        screenshot(app, name: "06-After-d4")

        // Move 3: Nf3
        tapSquare(board: chessBoard, inset: inset, cellSize: cellSize, col: 6, row: 7)
        sleep(1)
        tapSquare(board: chessBoard, inset: inset, cellSize: cellSize, col: 5, row: 5)
        sleep(3)
        screenshot(app, name: "07-After-Nf3")

        // Open chat panel
        let chatHeader = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Chat'")
        ).firstMatch
        if chatHeader.waitForExistence(timeout: 3) {
            chatHeader.tap()
            sleep(1)
            screenshot(app, name: "08-Chat-Opened")

            // Type a chat message
            let chatInput = app.textFields.firstMatch
            if chatInput.waitForExistence(timeout: 3) {
                chatInput.tap()
                chatInput.typeText("Great game!")

                // Send the message
                let sendButton = app.buttons.matching(
                    NSPredicate(format: "label CONTAINS[c] 'Send'")
                ).firstMatch
                if sendButton.waitForExistence(timeout: 2) {
                    sendButton.tap()
                }
                sleep(5)
                screenshot(app, name: "09-Chat-With-Bot-Reply")
            }
        }

        // Resign
        resignButton.tap()
        sleep(2)
        screenshot(app, name: "10-After-Resign")
    }

    // MARK: - Helpers

    private func tapSquare(
        board: XCUIElement, inset: CGFloat, cellSize: CGFloat,
        col: Int, row: Int
    ) {
        let point = board.coordinate(withNormalizedOffset: .zero)
            .withOffset(CGVector(
                dx: inset + (CGFloat(col) + 0.5) * cellSize,
                dy: inset + (CGFloat(row) + 0.5) * cellSize
            ))
        point.tap()
    }

    private func screenshot(_ app: XCUIApplication, name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
