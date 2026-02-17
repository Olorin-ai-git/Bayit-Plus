#if os(tvOS)
import BayitCore
import Foundation
import Observation

/// tvOS voice interaction coordinator.
/// On tvOS, voice input uses the system dictation keyboard (Siri Remote mic button).
/// This service manages the send-via-REST flow after the user dictates text.
@MainActor
@Observable
final class TVVoiceInteractionService {

    // MARK: - Public State

    private(set) var isListening = false
    private(set) var isProcessing = false
    private(set) var lastTranscript: String?
    private(set) var errorMessage: String?

    // MARK: - Private

    private let repository: any AvatarRepository
    private let logger = BayitLogger(category: "TVVoiceInteraction")

    init(repository: any AvatarRepository) {
        self.repository = repository
    }

    // MARK: - Voice Flow

    /// Signals that dictation has started (Siri Remote mic pressed).
    /// Used to update UI state for visual feedback.
    func startListening() {
        isListening = true
        lastTranscript = nil
        errorMessage = nil
        logger.info("tvOS dictation mode activated")
    }

    /// Processes dictated text and sends to character via REST API.
    func stopListeningAndSend(
        sessionId: String
    ) async -> CharacterResponsePayload? {
        isListening = false

        guard let transcript = lastTranscript, !transcript.isEmpty else {
            errorMessage = "No speech detected"
            return nil
        }

        isProcessing = true
        defer { isProcessing = false }

        do {
            let response = try await repository.sendInteractionMessage(
                sessionId: sessionId,
                message: transcript
            )
            logger.info("tvOS voice message sent via REST")
            return response
        } catch {
            logger.error("Failed to send voice message: \(error)")
            errorMessage = "Failed to send message"
            return nil
        }
    }

    /// Updates the transcript from the dictation text field.
    func updateTranscript(_ text: String) {
        lastTranscript = text
    }

    // MARK: - Cancel

    func cancelListening() {
        isListening = false
        lastTranscript = nil
    }
}
#endif
