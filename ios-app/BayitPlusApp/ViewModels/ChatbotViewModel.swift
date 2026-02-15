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
    private(set) var error: String?
    private(set) var conversationId: String?
    private(set) var suggestions: [String] = []
    private(set) var isRecording = false
    private(set) var voiceTranscript = ""

    var inputText = ""

    // MARK: - Private

    private let repository: any ChatRepository
    private let logger = BayitLogger(category: "ChatbotViewModel")
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    // MARK: - Init

    init(repository: any ChatRepository) {
        self.repository = repository
        self.speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
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

    // MARK: - Voice Input

    @MainActor
    func toggleVoiceInput() async {
        if isRecording {
            stopVoiceInput()
        } else {
            await startVoiceInput()
        }
    }

    @MainActor
    private func startVoiceInput() async {
        guard let speechRecognizer, speechRecognizer.isAvailable else {
            error = "Speech recognition is not available"
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            request.requiresOnDeviceRecognition = speechRecognizer.supportsOnDeviceRecognition
            recognitionRequest = request

            let inputNode = audioEngine.inputNode
            let format = inputNode.outputFormat(forBus: 0)
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
                request.append(buffer)
            }

            audioEngine.prepare()
            try audioEngine.start()

            recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, _ in
                if let result {
                    Task { @MainActor in
                        self?.voiceTranscript = result.bestTranscription.formattedString
                        self?.inputText = result.bestTranscription.formattedString
                    }
                }
            }

            isRecording = true
            voiceTranscript = ""

            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            logger.info("Voice input started")
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            logger.error("Failed to start voice input", error: error)
        }
    }

    @MainActor
    private func stopVoiceInput() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        isRecording = false

        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        logger.info("Voice input stopped", context: ["transcript": voiceTranscript])
    }
}
#endif
