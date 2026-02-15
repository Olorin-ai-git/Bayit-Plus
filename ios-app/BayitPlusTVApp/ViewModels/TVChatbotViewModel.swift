#if os(tvOS)
import BayitCore
import BayitVoice
import Foundation
import Observation

/// tvOS chatbot ViewModel with text and voice input via Siri Remote microphone.
@MainActor
@Observable
final class TVChatbotViewModel {

    // MARK: - Public State
    private(set) var messages: [ChatMessage] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var conversationId: String?
    private(set) var suggestions: [String] = []
    private(set) var isRecording = false
    private(set) var isTranscribing = false
    var inputText = ""

    // MARK: - Private
    private let repository: any ChatRepository
    private let audioService: TVAudioRecordingService
    private let logger = BayitLogger(category: "TVChatbotViewModel")

    // MARK: - Init
    init(repository: any ChatRepository) {
        self.repository = repository
        self.audioService = TVAudioRecordingService()
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

    // MARK: - Voice Input

    @MainActor
    func toggleVoiceInput() async {
        if isRecording {
            await stopVoiceInput()
        } else {
            startVoiceInput()
        }
    }

    @MainActor
    func startVoiceInput() {
        guard !isRecording else { return }
        error = nil

        do {
            try audioService.startRecording()
            isRecording = true
            logger.info("Voice input started via Siri Remote")
        } catch {
            self.error = "Microphone access unavailable"
            logger.error("Failed to start Siri Remote recording", error: error)
        }
    }

    @MainActor
    func stopVoiceInput() async {
        guard isRecording else { return }

        let audioData = audioService.stopRecording()
        isRecording = false
        logger.info(
            "Voice input stopped",
            context: ["audioBytes": "\(audioData.count)"]
        )

        guard !audioData.isEmpty else {
            error = "No audio captured"
            return
        }

        isTranscribing = true
        do {
            let response = try await repository.transcribeAudio(
                data: audioData, language: nil
            )
            if let transcription = response.text, !transcription.isEmpty {
                inputText = transcription
                logger.info("Transcription received", context: [
                    "text": transcription,
                    "confidence": "\(response.confidence ?? 0)"
                ])
                await sendMessage()
            } else {
                error = "Could not transcribe audio"
            }
        } catch {
            self.error = "Transcription failed"
            logger.error("Audio transcription failed", error: error)
        }
        isTranscribing = false
    }

    @MainActor
    func cancelVoiceInput() {
        audioService.cancelRecording()
        isRecording = false
        logger.info("Voice input cancelled")
    }

    // MARK: - Conversation Management
    @MainActor
    func startNewConversation() {
        messages = []
        conversationId = nil
        suggestions = []
        error = nil
        inputText = ""
        if isRecording { cancelVoiceInput() }
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
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to delete conversation", error: error)
        }

        isLoading = false
    }
}
#endif
