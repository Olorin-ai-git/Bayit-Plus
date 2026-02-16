import Foundation

/// WebSocket connection and message handling for direct messages.
extension DirectMessagesViewModel {

    @MainActor
    func connectWebSocket(friendId: String) async {
        do {
            guard let token = try await authTokenProvider.currentToken() else { return }
            connection = try await repository.connectWebSocket(
                friendId: friendId, authToken: token
            )
            startReceiving()
            await flushPendingMessages(friendId: friendId)
        } catch {
            logger.error("DM WS connect failed", error: error)
        }
    }

    func startReceiving() {
        guard let conn = connection else { return }
        receiveTask = Task { [weak self] in
            let stream = await conn.receive()
            for await text in stream {
                self?.handleWSMessage(text)
            }
        }
    }

    @MainActor
    func handleWSMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        switch type {
        case "new_message":
            decodeAndAppendMessage(data)
        case "typing":
            if let userId = json["user_id"] as? String { typingUsers.insert(userId) }
        case "stop_typing":
            if let userId = json["user_id"] as? String { typingUsers.remove(userId) }
        case "read_receipt":
            if let msgId = json["message_id"] as? String { markMessageRead(msgId) }
        case "reaction", "message_translated":
            decodeAndUpdateMessage(data)
        default:
            break
        }
    }

    @MainActor
    private func decodeAndAppendMessage(_ data: Data) {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        if let msg = try? decoder.decode(DirectMessageModel.self, from: data) {
            messages.append(msg)
        }
    }

    @MainActor
    private func markMessageRead(_ messageId: String) {
        if let idx = messages.firstIndex(where: { $0.id == messageId }) {
            let old = messages[idx]
            let updated = DirectMessageModel(
                id: old.id, senderId: old.senderId, senderName: old.senderName,
                senderAvatar: old.senderAvatar, receiverId: old.receiverId,
                receiverName: old.receiverName, receiverAvatar: old.receiverAvatar,
                message: old.message, displayMessage: old.displayMessage,
                messageType: old.messageType, sourceLanguage: old.sourceLanguage,
                isTranslated: old.isTranslated, translationAvailable: old.translationAvailable,
                read: true, readAt: Date(), reactions: old.reactions, timestamp: old.timestamp
            )
            messages[idx] = updated
        }
    }

    @MainActor
    private func decodeAndUpdateMessage(_ data: Data) {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        if let msg = try? decoder.decode(DirectMessageModel.self, from: data) {
            if let idx = messages.firstIndex(where: { $0.id == msg.id }) {
                messages[idx] = msg
            }
        }
    }

    func sendWSPayload(_ payload: String) async {
        guard let conn = connection else { return }
        do {
            try await conn.send(message: payload)
        } catch {
            logger.error("DM WS send failed", error: error)
        }
    }

    @MainActor
    func flushPendingMessages(friendId: String) async {
        let pending = pendingMessages.filter { $0.friendId == friendId }
        pendingMessages.removeAll { $0.friendId == friendId }
        for item in pending {
            await sendMessage(friendId: item.friendId, text: item.message)
        }
    }
}
