import BayitCore
import BayitNetworking
import Foundation
import Observation

/// ViewModel for the direct messages feature.
/// Manages conversation list, active conversation messages, and offline queuing.
/// WebSocket handling is in `DirectMessagesViewModel+WebSocket.swift`.
@MainActor
@Observable
final class DirectMessagesViewModel {
    private(set) var conversations: [ConversationSummary] = []
    var messages: [DirectMessageModel] = []
    private(set) var isLoading = false
    private(set) var error: String?
    var typingUsers: Set<String> = []
    private(set) var totalUnreadCount = 0

    var searchQuery = ""
    var activeFriendId: String?

    let repository: any DirectMessageRepository
    let authTokenProvider: AuthTokenProvider
    var connection: WebSocketConnection?
    var receiveTask: Task<Void, Never>?
    var pendingMessages: [(friendId: String, message: String)] = []
    let logger = BayitLogger(category: "DirectMessages")

    init(repository: any DirectMessageRepository, authTokenProvider: AuthTokenProvider) {
        self.repository = repository
        self.authTokenProvider = authTokenProvider
    }

    /// Filtered conversations based on current search query.
    var filteredConversations: [ConversationSummary] {
        guard !searchQuery.isEmpty else { return conversations }
        return conversations.filter {
            $0.friendName.localizedCaseInsensitiveContains(searchQuery)
        }
    }

    // MARK: - Conversation List

    @MainActor
    func loadConversations() async {
        isLoading = true
        error = nil
        do {
            conversations = try await repository.fetchConversations()
            totalUnreadCount = conversations.reduce(0) { $0 + $1.unreadCount }
            logger.info("Conversations loaded", context: [
                "count": String(conversations.count)
            ])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to load conversations", error: error)
        }
        isLoading = false
    }

    // MARK: - Messages

    @MainActor
    func loadMessages(friendId: String) async {
        isLoading = true
        error = nil
        activeFriendId = friendId
        do {
            messages = try await repository.fetchMessages(friendId: friendId)
            try await repository.markAllRead(friendId: friendId)
            updateUnreadCount(friendId: friendId, to: 0)
            await connectWebSocket(friendId: friendId)
            logger.info("Messages loaded", context: [
                "friendId": friendId,
                "count": String(messages.count)
            ])
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to load messages", error: error)
        }
        isLoading = false
    }

    @MainActor
    func sendMessage(friendId: String, text: String) async {
        do {
            let sent = try await repository.sendMessage(friendId: friendId, message: text)
            messages.append(sent)
            logger.info("Message sent", context: ["friendId": friendId])
        } catch {
            pendingMessages.append((friendId: friendId, message: text))
            logger.error("Send failed, queued offline", error: error)
        }
    }

    @MainActor
    func translateMessage(messageId: String) async {
        do {
            let translated = try await repository.translateMessage(messageId: messageId)
            if let idx = messages.firstIndex(where: { $0.id == messageId }) {
                messages[idx] = translated
            }
        } catch {
            logger.error("Translation failed", error: error)
        }
    }

    @MainActor
    func addReaction(messageId: String, reaction: String) async {
        do {
            try await repository.addReaction(messageId: messageId, reaction: reaction)
        } catch {
            logger.error("Reaction failed", error: error)
        }
    }

    @MainActor
    func sendTypingIndicator(friendId: String) async {
        await sendWSPayload("{\"type\":\"typing\",\"friend_id\":\"\(friendId)\"}")
    }

    @MainActor
    func sendStopTyping(friendId: String) async {
        await sendWSPayload("{\"type\":\"stop_typing\",\"friend_id\":\"\(friendId)\"}")
    }

    // MARK: - Disconnect

    @MainActor
    func disconnect() async {
        receiveTask?.cancel()
        receiveTask = nil
        if let conn = connection { await conn.disconnect() }
        connection = nil
        activeFriendId = nil
        typingUsers.removeAll()
    }

    // MARK: - Helpers

    @MainActor
    func updateUnreadCount(friendId: String, to count: Int) {
        if let idx = conversations.firstIndex(where: { $0.friendId == friendId }) {
            let old = conversations[idx]
            conversations[idx] = ConversationSummary(
                friendId: old.friendId, friendName: old.friendName,
                friendAvatar: old.friendAvatar, lastMessage: old.lastMessage,
                lastMessageAt: old.lastMessageAt, unreadCount: count
            )
        }
        totalUnreadCount = conversations.reduce(0) { $0 + $1.unreadCount }
    }
}
