import BayitLocalization
import Foundation

/// Game action methods extracted from ChessViewModel for the 200-line limit.
extension ChessViewModel {
    @MainActor
    func createGameForWhatsApp(
        color: String,
        timeControl: Int?,
        localization: LocalizationManager
    ) async {
        isLoading = true
        error = nil
        do {
            let created = try await repository.createGame(
                color: color, gameMode: "pvp", botDifficulty: nil, timeControl: timeControl
            )
            applyGameState(created)
            await connectWebSocket(gameCode: created.gameCode)
            let link = "https://\(webHost)/chess/\(created.gameCode)"
            let message = localization.t(
                "chess.whatsAppMessage",
                ["code": created.gameCode, "link": link]
            )
            pendingWhatsAppMessage = message
            logger.info("WhatsApp challenge created", context: ["gameCode": created.gameCode])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to create WhatsApp challenge", error: error)
        }
        isLoading = false
    }

    @MainActor
    func loadGame(gameId: String) async {
        isLoading = true
        error = nil
        do {
            let fetched = try await repository.getGameState(gameId: gameId)
            applyGameState(fetched)
            logger.info("Game loaded", context: ["gameId": gameId])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to load game", error: error)
        }
        isLoading = false
    }

    @MainActor
    func createGame(color: String, gameMode: String, botDifficulty: String?, timeControl: Int? = nil) async {
        isLoading = true
        error = nil
        do {
            let created = try await repository.createGame(
                color: color, gameMode: gameMode, botDifficulty: botDifficulty, timeControl: timeControl
            )
            applyGameState(created)
            await connectWebSocket(gameCode: created.gameCode)
            logger.info("Game created", context: ["gameCode": created.gameCode])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to create game", error: error)
        }
        isLoading = false
    }

    @MainActor
    func joinGame(code: String) async {
        isLoading = true
        error = nil
        do {
            let joined = try await repository.joinGame(gameCode: code)
            applyGameState(joined)
            await connectWebSocket(gameCode: joined.gameCode)
            showingJoinSheet = false
            joinCode = ""
            logger.info("Game joined", context: ["gameCode": joined.gameCode])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to join game", error: error)
        }
        isLoading = false
    }

    @MainActor
    func sendMove(from: (Int, Int), to: (Int, Int)) async {
        let fromNotation = squareNotation(row: from.0, col: from.1)
        let toNotation = squareNotation(row: to.0, col: to.1)
        lastMove = (from: (row: from.0, col: from.1), to: (row: to.0, col: to.1))

        if let conn = connection, await conn.state == .connected {
            let payload = "{\"type\":\"move\",\"from\":\"\(fromNotation)\",\"to\":\"\(toNotation)\"}"
            await sendWSPayload(payload)
        } else if let gameCode = game?.gameCode {
            await sendMoveViaREST(gameCode: gameCode, from: fromNotation, to: toNotation)
        }
        selectedSquare = nil
    }

    @MainActor
    func sendMoveViaREST(gameCode: String, from: String, to: String) async {
        do {
            let updated = try await repository.makeMove(gameCode: gameCode, from: from, to: to)
            applyGameState(updated)
            logger.info("Move via REST", context: ["from": from, "to": to])
            if updated.gameMode == .bot, updated.status == .active {
                Task {
                    try? await Task.sleep(nanoseconds: 1_500_000_000)
                    await pollGameState(gameCode: gameCode)
                }
            }
        } catch {
            logger.warning("Illegal move rejected", context: ["from": from, "to": to])
            lastMove = nil
            selectedSquare = nil
        }
    }

    @MainActor
    func pollGameState(gameCode: String) async {
        do {
            let refreshed = try await repository.getGameState(gameId: gameCode)
            applyGameState(refreshed)
        } catch {
            logger.error("Poll game state failed", error: error)
        }
    }

    @MainActor func resign() async {
        await sendWSPayload("{\"type\":\"resign\"}")
    }

    @MainActor func offerDraw() async {
        await sendWSPayload("{\"type\":\"offer_draw\"}")
        drawOffered = true
    }

    @MainActor func respondToDraw(accept: Bool) async {
        await sendWSPayload("{\"type\":\"draw_response\",\"accept\":\(accept)}")
        drawOffered = false
    }

    @MainActor
    func inviteFriend(friendUserId: String, color: String = "white", timeControl: Int? = nil) async {
        isLoading = true
        error = nil
        do {
            let invited = try await repository.invitePlayer(
                friendUserId: friendUserId, color: color, timeControl: timeControl
            )
            applyGameState(invited)
            await connectWebSocket(gameCode: invited.gameCode)
            logger.info("Friend invited", context: ["friendUserId": friendUserId])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to invite friend", error: error)
        }
        isLoading = false
    }

    @MainActor
    func sendChatMessage(_ text: String) async {
        if let conn = connection, await conn.state == .connected {
            let escaped = text.replacingOccurrences(of: "\"", with: "\\\"")
            await sendWSPayload("{\"type\":\"chat\",\"message\":\"\(escaped)\"}")
        } else if let gameCode = game?.gameCode {
            await sendChatViaREST(gameCode: gameCode, message: text)
        }
    }

    @MainActor
    private func sendChatViaREST(gameCode: String, message: String) async {
        do {
            let msg = try await repository.sendChatMessage(gameCode: gameCode, message: message)
            chatMessages.append(msg)
        } catch {
            logger.error("REST chat send failed", error: error)
        }
    }
}
