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
            await loadChatHistory(gameCode: gameCode)
        } catch {
            logger.error("Chess WS connect failed", error: error)
        }
    }

    func startReceiving() {
        guard let conn = connection else { return }
        receiveTask = Task { [weak self] in
            let stream = await conn.receive()
            for await text in stream {
                self?.handleWSMessage(text)
            }
            // Stream ended -- reconnect if the game is still active
            guard let self, let code = self.game?.gameCode,
                  self.gameStatus == .active || self.gameStatus == .waiting
            else { return }
            self.logger.info("WS stream ended, reconnecting", context: ["gameCode": code])
            await self.connectWebSocket(gameCode: code)
        }
    }

    @MainActor
    func handleWSMessage(_ text: String) {
        guard let rawData = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: rawData) as? [String: Any],
              let type = json["type"] as? String else { return }

        let payload = json["data"] as? [String: Any] ?? [:]

        switch type {
        case "game_state":
            decodeGameState(payload)
        case "move":
            handleMoveMessage(payload)
        case "chat":
            handleChatMessage(payload)
        case "draw_offer":
            drawOffered = true
        case "draw_declined":
            drawOffered = false
        case "draw_response":
            drawOffered = false
        case "game_end":
            if let status = payload["status"] as? String {
                gameStatus = ChessGameStatus(rawValue: status) ?? gameStatus
                stopCountdown()
            }
        case "resign", "game_over":
            if let status = payload["status"] as? String {
                gameStatus = ChessGameStatus(rawValue: status) ?? gameStatus
                stopCountdown()
            }
        default:
            break
        }
    }

    @MainActor
    private func decodeGameState(_ payload: [String: Any]) {
        guard let payloadData = try? JSONSerialization.data(withJSONObject: payload) else { return }
        if let gameData = try? WebSocketDecoder.shared.decode(ChessGame.self, from: payloadData) {
            applyGameState(gameData)
        }
    }

    @MainActor
    private func handleMoveMessage(_ payload: [String: Any]) {
        if let fen = payload["board_fen"] as? String { parseFEN(fen) }
        if let turn = payload["current_turn"] as? String {
            currentTurn = PlayerColor(rawValue: turn) ?? currentTurn
        }
        if let status = payload["status"] as? String {
            gameStatus = ChessGameStatus(rawValue: status) ?? gameStatus
        }
        if let whiteMs = payload["white_time_remaining_ms"] as? Int {
            whiteTimeRemainingMs = whiteMs
        }
        if let blackMs = payload["black_time_remaining_ms"] as? Int {
            blackTimeRemainingMs = blackMs
        }
        if let moveDict = payload["move"] as? [String: Any] {
            appendMoveFromJSON(moveDict)
        }
        if game?.timeControl != nil, gameStatus == .active {
            startCountdown()
        }
    }

    @MainActor
    private func handleChatMessage(_ payload: [String: Any]) {
        guard let payloadData = try? JSONSerialization.data(withJSONObject: payload) else { return }
        if let msg = try? WebSocketDecoder.shared.decode(ChessChatMessage.self, from: payloadData) {
            chatMessages.append(msg)
        }
    }

    @MainActor
    func appendMoveFromJSON(_ json: [String: Any]) {
        guard let notation = json["san"] as? String else { return }
        let moveNum = (moveHistory.count / 2) + 1
        if let last = moveHistory.last, last.blackMove == nil {
            moveHistory[moveHistory.count - 1] = ChessMove(
                moveNumber: last.moveNumber, whiteMove: last.whiteMove, blackMove: notation
            )
        } else {
            moveHistory.append(ChessMove(moveNumber: moveNum, whiteMove: notation, blackMove: nil))
        }
    }

    @MainActor
    private func loadChatHistory(gameCode: String) async {
        do {
            chatMessages = try await repository.loadChatHistory(gameCode: gameCode)
        } catch {
            logger.error("Failed to load chat history", error: error)
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
