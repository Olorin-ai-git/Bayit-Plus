import BayitCore
import Foundation
import Observation

/// tvOS chatbot ViewModel. Text-input only — no speech/mic APIs on Apple TV.
@Observable
final class TVChatbotViewModel {

    // MARK: - Public State
    private(set) var messages: [ChatMessage] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var conversationId: String?
    private(set) var suggestions: [String] = []
    var inputText = ""

    // MARK: - Private
    private let repository: any ChatRepository
    private let logger = BayitLogger(category: "TVChatbotViewModel")

    // MARK: - Init
    init(repository: any ChatRepository) {
        self.repository = repository
    }

    // MARK: - Messaging
    @MainActor
    func sendMessage() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let userMsg = ChatMessage(
            id: UUID().uuidString,
            role: "user",
            content: text,
            timestamp: nil
        )
        messages.append(userMsg)
        inputText = ""
        isLoading = true
        error = nil

        do {
            let request = ChatRequest(
                message: text,
                conversationId: conversationId,
                context: nil,
                language: nil
            )
            let response = try await repository.sendMessage(request)
            conversationId = response.conversationId
            suggestions = response.suggestions ?? []

            let aiMsg = ChatMessage(
                id: UUID().uuidString,
                role: "assistant",
                content: response.response,
                timestamp: nil
            )
            messages.append(aiMsg)
            logger.info("Chat message sent", context: [
                "conversationId": conversationId ?? "new"
            ])
        } catch {
            self.error = error.localizedDescription
            logger.error("Chat message failed", error: error)
        }

        isLoading = false
    }

    @MainActor
    func sendSuggestion(_ suggestion: String) async {
        inputText = suggestion
        await sendMessage()
    }

    // MARK: - Conversation Management
    @MainActor
    func startNewConversation() {
        messages = []
        conversationId = nil
        suggestions = []
        error = nil
        inputText = ""
        logger.info("New conversation started")
    }

    @MainActor
    func deleteConversation() async {
        guard let conversationId else { return }
        isLoading = true

        do {
            try await repository.deleteConversation(id: conversationId)
            messages = []
            self.conversationId = nil
            suggestions = []
            logger.info("Conversation deleted", context: ["id": conversationId])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to delete conversation", error: error)
        }

        isLoading = false
    }
}
