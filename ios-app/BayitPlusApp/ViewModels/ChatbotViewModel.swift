#if os(iOS)
    import AVFoundation
    import BayitCore
    import Foundation
    import Observation
    import Speech
    import UIKit

    /// ViewModel for the AI chatbot conversation interface.
    /// Available on iOS only. Depends on Speech.framework for voice input.
    ///
    /// Manages message history, API communication, voice input via Speech framework,
    /// and contextual suggestions. Uses ChatRepository for all backend communication.
    @MainActor
    @Observable
    final class ChatbotViewModel {
        // MARK: - Public State

        private(set) var messages: [ChatMessage] = []
        private(set) var isLoading = false
        var error: String?
        private(set) var conversationId: String?
        private(set) var suggestions: [String] = []
        var isRecording = false
        var voiceTranscript = ""

        var inputText = ""

        // MARK: - Private

        private let repository: any ChatRepository
        let logger = BayitLogger(category: "ChatbotViewModel")
        var speechRecognizer: SFSpeechRecognizer?
        var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
        var recognitionTask: SFSpeechRecognitionTask?
        let audioEngine = AVAudioEngine()

        // MARK: - Init

        init(repository: any ChatRepository) {
            self.repository = repository
            speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
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

            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()

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
                    "conversationId": conversationId ?? "new",
                ])
            } catch {
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
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
        func loadConversation(id: String) async {
            isLoading = true
            error = nil

            do {
                let loadedMessages = try await repository.getConversation(id: id)
                messages = loadedMessages
                conversationId = id
                logger.info("Conversation loaded", context: ["id": id])
            } catch {
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
                logger.error("Failed to load conversation", error: error)
            }

            isLoading = false
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
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
                logger.error("Failed to delete conversation", error: error)
            }

            isLoading = false
        }

        @MainActor
        func startNewConversation() {
            messages = []
            conversationId = nil
            suggestions = []
            error = nil
            inputText = ""
            logger.info("New conversation started")
        }
    }
#endif
