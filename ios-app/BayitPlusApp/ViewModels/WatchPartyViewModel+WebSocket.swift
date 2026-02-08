import BayitNetworking
import Foundation

/// WebSocket connection and message handling for WatchPartyViewModel.
extension WatchPartyViewModel {

    @MainActor
    func connectWebSocket(
        manager: WebSocketManager,
        authToken: String,
        userId: String
    ) async {
        guard let partyId = activeParty?.id else { return }
        webSocketManager = manager
        currentUserId = userId

        do {
            let conn = try await repository.connectWebSocket(
                partyId: partyId, manager: manager, authToken: authToken
            )
            connection = conn
            isConnected = true
            logger.info("WebSocket connected for party", context: ["partyId": partyId])
            startReceiving(connection: conn)
        } catch {
            self.error = error.localizedDescription
            logger.error("WebSocket connection failed", error: error)
        }
    }

    func disconnectWebSocket() {
        receiveTask?.cancel()
        receiveTask = nil
        if let conn = connection {
            Task { await conn.disconnect() }
        }
        connection = nil
        isConnected = false
    }

    // MARK: - Receive Loop

    func startReceiving(connection: WebSocketConnection) {
        receiveTask = Task { [weak self] in
            let stream = await connection.receive()
            for await text in stream {
                await self?.handleWSMessage(text)
            }
            await MainActor.run { self?.isConnected = false }
        }
    }

    @MainActor
    func handleWSMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        guard let message = try? decoder.decode(WatchPartyWSMessage.self, from: data) else {
            logger.warning("Failed to decode WS message")
            return
        }

        switch message.type {
        case .connected:
            logger.info("Party WS authenticated")
        case .chatMessage:
            appendChatMessage(from: message)
        case .participantJoined:
            handleParticipantJoined(message)
        case .participantLeft:
            handleParticipantLeft(message)
        case .playbackSync:
            logger.debug("Playback sync received", context: [
                "position": String(message.position ?? 0)
            ])
        case .hostChanged:
            logger.info("Host changed", context: [
                "newHost": message.newHostName ?? "unknown"
            ])
        case .partyEnded:
            activeParty = nil
            chatMessages = []
            participants = []
            disconnectWebSocket()
        case .error:
            self.error = message.message
        }
    }

    // MARK: - Message Handlers

    @MainActor
    private func appendChatMessage(from message: WatchPartyWSMessage) {
        guard let userId = message.userId,
              let userName = message.userName,
              let text = message.message else { return }

        let chatMsg = PartyChatMessage(
            id: UUID().uuidString,
            userId: userId,
            userName: userName,
            message: text,
            timestamp: message.timestamp ?? Date(),
            isSent: userId == currentUserId
        )
        chatMessages.append(chatMsg)
    }

    @MainActor
    private func handleParticipantJoined(_ message: WatchPartyWSMessage) {
        guard let userId = message.userId,
              let userName = message.userName else { return }
        let state = ParticipantState(
            userId: userId, userName: userName,
            isSpeaking: false, isMuted: false, isVideoOn: false, joinedAt: Date()
        )
        if !participants.contains(where: { $0.userId == userId }) {
            participants.append(state)
        }
    }

    @MainActor
    private func handleParticipantLeft(_ message: WatchPartyWSMessage) {
        guard let userId = message.userId else { return }
        participants.removeAll { $0.userId == userId }
    }
}
