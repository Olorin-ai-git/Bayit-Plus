import BayitCore
import Foundation

// MARK: - Multi-Character (Phase 3)

extension AvatarDialogueViewModel {
    func setMultiCharacters(_ characters: [CharacterProfile]) {
        multiCharacters = characters
        isMultiCharacterMode = !characters.isEmpty
        if let first = characters.first, addressedCharacterName.isEmpty {
            addressedCharacterName = first.name
        }
    }

    func sendMultiCharacterMessage(
        _ text: String
    ) async -> MultiCharacterResponse? {
        guard let sessionId, isActive, isMultiCharacterMode else { return nil }
        isSending = true
        defer { isSending = false }

        do {
            let response = try await repository.sendMultiCharacterMessage(
                sessionId: sessionId,
                message: text,
                addressedCharacter: addressedCharacterName
            )

            let userExchange = DialogueExchange(
                speaker: "user",
                messageText: text,
                audioUrl: nil,
                animatedVideoUrl: nil,
                characterName: nil,
                addressedTo: addressedCharacterName,
                reactionTo: nil,
                participantUserId: nil,
                participantName: nil
            )
            exchanges.append(userExchange)

            for exchange in response.exchanges {
                let dialogueExchange = DialogueExchange(
                    speaker: exchange.speaker,
                    messageText: exchange.messageText,
                    audioUrl: exchange.audioUrl,
                    animatedVideoUrl: exchange.animatedVideoUrl,
                    characterName: exchange.characterName,
                    addressedTo: nil,
                    reactionTo: exchange.reactionTo,
                    participantUserId: nil,
                    participantName: nil
                )
                exchanges.append(dialogueExchange)
            }

            logger.info("Multi-character message sent")
            return response
        } catch {
            logger.error("Failed to send multi-character message: \(error)")
            return nil
        }
    }
}
