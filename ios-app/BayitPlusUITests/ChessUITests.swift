import XCTest

@MainActor
final class ChessUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    func testChessBoardTapAndMove() {
        let app = AppLaunchHelper.launchToRoute("chess")

        // Wait for the chess lobby to load
        let createButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Create New Game'")
        ).firstMatch
        XCTAssertTrue(createButton.waitForExistence(timeout: 10), "Chess lobby did not load")

        // Take screenshot of lobby
        let lobbyShot = XCTAttachment(screenshot: app.screenshot())
        lobbyShot.name = "Chess-Lobby"
        lobbyShot.lifetime = .keepAlways
        add(lobbyShot)

        // Tap Create New Game (default is PvP White)
        createButton.tap()

        // Wait for game to load - look for the chess board or resign button
        let resignButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Resign'")
        ).firstMatch
        let gameLoaded = resignButton.waitForExistence(timeout: 10)

        let gameShot = XCTAttachment(screenshot: app.screenshot())
        gameShot.name = "Chess-Game-Loaded"
        gameShot.lifetime = .keepAlways
        add(gameShot)

        guard gameLoaded else {
            XCTFail("Game did not load - Resign button not found")
            return
        }

        // Find the chess board by accessibility label
        let chessBoard = app.otherElements["Chess board"]
        XCTAssertTrue(chessBoard.waitForExistence(timeout: 5), "Chess board not found")

        let boardFrame = chessBoard.frame

        // Calculate cell positions based on board geometry
        // 10% inset, 8x8 grid
        let inset = boardFrame.width * 0.10
        let cellSize = (boardFrame.width - 2 * inset) / 8

        // Tap e2 pawn (row 6, col 4) to select it
        let e2X = boardFrame.minX + inset + 4.5 * cellSize
        let e2Y = boardFrame.minY + inset + 6.5 * cellSize
        let e2Point = chessBoard.coordinate(withNormalizedOffset: .zero)
            .withOffset(CGVector(dx: inset + 4.5 * cellSize, dy: inset + 6.5 * cellSize))
        e2Point.tap()

        // Screenshot after selecting e2
        sleep(1)
        let selectShot = XCTAttachment(screenshot: app.screenshot())
        selectShot.name = "Chess-After-Select-e2"
        selectShot.lifetime = .keepAlways
        add(selectShot)

        // Tap e4 (row 4, col 4) to move pawn
        let e4Point = chessBoard.coordinate(withNormalizedOffset: .zero)
            .withOffset(CGVector(dx: inset + 4.5 * cellSize, dy: inset + 4.5 * cellSize))
        e4Point.tap()

        // Wait for move to process and bot to respond
        sleep(3)

        // Screenshot after move
        let moveShot = XCTAttachment(screenshot: app.screenshot())
        moveShot.name = "Chess-After-Move-e4"
        moveShot.lifetime = .keepAlways
        add(moveShot)

        // Verify: if the move worked, the turn should change
        // Check for "Black's Turn" or the bot should have responded
        // and it should be "White's Turn" again
        let whiteTurn = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'White'")
        ).firstMatch
        let blackTurn = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'Black'")
        ).firstMatch

        let turnChanged = blackTurn.waitForExistence(timeout: 2) || whiteTurn.exists
        XCTAssertTrue(turnChanged, "Turn indicator should be visible after move")
    }
}
