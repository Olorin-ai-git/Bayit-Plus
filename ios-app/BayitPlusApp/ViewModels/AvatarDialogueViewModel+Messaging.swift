import BayitCore
import BayitNetworking
import Foundation

// MARK: - Messaging & Pause-Ask

extension AvatarDialogueViewModel {
    func sendMessage(_ text: String) async -> CharacterResponsePayload? {
        guard let sessionId, isActive else { return nil }
        isSending = true
        startSendingProgress()
        defer {
            isSending = false
            sendingProgressTask?.cancel()
            sendingStatus = ""
        }

        do {
            let response = try await repository.sendInteractionMessage(
                sessionId: sessionId,
                message: text
            )

            let userExchange = DialogueExchange(
                speaker: "user",
                messageText: text,
                audioUrl: nil,
                animatedVideoUrl: nil,
                characterName: nil,
                addressedTo: nil,
                reactionTo: nil,
                participantUserId: nil,
                participantName: nil
            )
            let characterExchange = DialogueExchange(
                speaker: "character",
                messageText: response.responseText,
                audioUrl: response.audioUrl,
                animatedVideoUrl: response.animatedVideoUrl,
                characterName: response.characterName,
                addressedTo: nil,
                reactionTo: nil,
                participantUserId: nil,
                participantName: nil
            )
            exchanges.append(userExchange)
            exchanges.append(characterExchange)

            logger.info("Message sent, character responded")
            return response

        } catch {
            logger.error("Failed to send message: \(error)")
            return nil
        }
    }

    func sendPauseAskMessage(
        _ text: String,
        languageHint: String = ""
    ) async -> PauseAskResponse? {
        guard let sessionId, isActive else { return nil }
        isSending = true
        lastError = nil
        lastFailedService = nil
        startSendingProgress()
        defer {
            isSending = false
            sendingProgressTask?.cancel()
            sendingStatus = ""
        }

        do {
            let response = try await repository.sendPauseAskMessage(
                sessionId: sessionId,
                message: text,
                languageHint: languageHint
            )

            let userExchange = DialogueExchange(
                speaker: "user",
                messageText: response.userPolishedText,
                audioUrl: response.userAudioUrl,
                animatedVideoUrl: response.userAnimatedVideoUrl,
                characterName: nil,
                addressedTo: nil,
                reactionTo: nil,
                participantUserId: nil,
                participantName: nil
            )
            let characterExchange = DialogueExchange(
                speaker: "character",
                messageText: response.characterResponseText,
                audioUrl: response.characterAudioUrl,
                animatedVideoUrl: response.characterAnimatedVideoUrl,
                characterName: response.characterName,
                addressedTo: nil,
                reactionTo: nil,
                participantUserId: nil,
                participantName: nil
            )
            exchanges.append(userExchange)
            exchanges.append(characterExchange)

            logger.info("Pause & Ask exchange completed")
            return response
        } catch {
            let (service, detail) = Self.parseServiceError(error)
            lastFailedService = service
            lastError = detail
            logger.error("Pause & Ask failed: \(error)")
            return nil
        }
    }

    /// Parse a service-specific error from the backend 502 response.
    /// The backend returns `{"detail": {"message": "...", "failed_service": "..."}}`.
    private static func parseServiceError(
        _ error: Error
    ) -> (service: String?, detail: String) {
        if let apiError = error as? APIError {
            switch apiError {
            case let .serverError(code, message) where code == 502:
                return parseServiceDetail(message)
            case let .paymentRequired(message):
                return (service: "credits", detail: message)
            case let .serverError(_, message):
                return (service: nil, detail: message)
            default:
                return (service: nil, detail: apiError.localizedDescription ?? "Unknown error")
            }
        }
        return (service: nil, detail: error.localizedDescription)
    }

    private static func parseServiceDetail(
        _ raw: String
    ) -> (service: String?, detail: String) {
        guard let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return (service: nil, detail: raw)
        }
        let service = json["failed_service"] as? String
        let message = json["message"] as? String ?? raw
        return (service: service, detail: message)
    }
}
