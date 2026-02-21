import BayitCore
import Foundation

// MARK: - Messaging & Pause-Ask

extension AvatarDialogueViewModel {
    func sendMessage(_ text: String) async -> CharacterResponsePayload? {
        guard let sessionId, isActive else { return nil }
        isSending = true
        defer { isSending = false }

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
        defer { isSending = false }

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
            logger.error("Pause & Ask failed: \(error)")
            return nil
        }
    }
}
