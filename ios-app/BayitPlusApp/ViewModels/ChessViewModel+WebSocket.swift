import Foundation

/// WebSocket connection and message handling for chess games.
extension ChessViewModel {

    @MainActor
    func connectWebSocket(gameCode: String) async {
        do {
            guard let token = try await authTokenProvider.currentToken() else { return }
            connection = try await repository.connectWebSocket(
                gameCode: gameCode, authToken: token
            )
            startReceiving()
        } catch {
            logger.error("Chess WS connect failed", error: error)
        }
    }

    func startReceiving() {
        guard let conn = connection else { return }
        receiveTask = Task { [weak self] in
            let stream = await conn.receive()
            for await text in stream {
                await self?.handleWSMessage(text)
            }
        }
    }

    @MainActor
    func handleWSMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        switch type {
        case "game_state":
            decodeGameState(data)
        case "move":
            handleMoveMessage(json)
        case "draw_offer":
            drawOffered = true
        case "draw_response":
            drawOffered = false
        case "resign", "game_over":
            if let status = json["status"] as? String {
                gameStatus = ChessGameStatus(rawValue: status) ?? gameStatus
            }
        default:
            break
        }
    }

    @MainActor
    private func decodeGameState(_ data: Data) {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        if let gameData = try? decoder.decode(ChessGame.self, from: data) {
            applyGameState(gameData)
        }
    }

    @MainActor
    private func handleMoveMessage(_ json: [String: Any]) {
        if let fen = json["board_fen"] as? String { parseFEN(fen) }
        if let turn = json["current_turn"] as? String {
            currentTurn = PlayerColor(rawValue: turn) ?? currentTurn
        }
        appendMoveFromJSON(json)
    }

    @MainActor
    func appendMoveFromJSON(_ json: [String: Any]) {
        guard let notation = json["notation"] as? String else { return }
        let moveNum = (moveHistory.count / 2) + 1
        if let last = moveHistory.last, last.blackMove == nil {
            moveHistory[moveHistory.count - 1] = ChessMove(
                moveNumber: last.moveNumber, whiteMove: last.whiteMove, blackMove: notation
            )
        } else {
            moveHistory.append(ChessMove(moveNumber: moveNum, whiteMove: notation, blackMove: nil))
        }
    }

    func sendWSPayload(_ payload: String) async {
        guard let conn = connection else { return }
        do {
            try await conn.send(message: payload)
        } catch {
            logger.error("Chess WS send failed", error: error)
        }
    }
}
