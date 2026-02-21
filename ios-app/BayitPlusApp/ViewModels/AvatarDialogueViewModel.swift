import BayitCore
import Foundation
import Observation

/// Manages free-form dialogue sessions between user avatar and movie characters.
/// Loads available characters, starts sessions, and sends messages.
@MainActor
@Observable
final class AvatarDialogueViewModel {
    // MARK: - Public State

    private(set) var availableCharacters: [ContentCharacter] = []
    var selectedCharacter: ContentCharacter?
    private(set) var sessionId: String?
    private(set) var exchanges: [DialogueExchange] = []
    private(set) var isSending = false
    private(set) var isActive = false

    // MARK: - Multi-Character State (Phase 3)

    private(set) var multiCharacters: [CharacterProfile] = []
    private(set) var isMultiCharacterMode = false
    var addressedCharacterName: String = ""

    // MARK: - Private

    private let repository: any AvatarRepository
    private let logger = BayitLogger(category: "AvatarDialogueVM")

    init(repository: any AvatarRepository) {
        self.repository = repository
    }

    // MARK: - Load Characters

    func loadCharacters(contentId: String) async {
        do {
            availableCharacters = try await repository.fetchInteractiveCharacters(
                contentId: contentId
            )
            logger.info(
                "Loaded \(availableCharacters.count) interactive characters"
            )
        } catch {
            logger.error("Failed to load characters: \(error)")
            availableCharacters = []
        }
    }

    // MARK: - Start Session

    func startSession(
        contentId: String,
        profileId: String,
        avatarId: String,
        character: ContentCharacter,
        currentTimestamp: Double
    ) async {
        selectedCharacter = character
        do {
            let response = try await repository.startFreeInteractionSession(
                profileId: profileId,
                avatarId: avatarId,
                contentId: contentId,
                characterName: character.name,
                currentTimestamp: currentTimestamp
            )
            sessionId = response.id
            isActive = true
            exchanges = []
            logger.info("Free dialogue session started: \(response.id)")
        } catch {
            logger.error("Failed to start session: \(error)")
            selectedCharacter = nil
        }
    }

    // MARK: - Send Message

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

    // MARK: - Pause & Ask

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

    // MARK: - Multi-Character (Phase 3)

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

    // MARK: - End Session

    func endSession() async {
        guard let sessionId else { return }

        do {
            _ = try await repository.completeInteractionSession(
                sessionId: sessionId
            )
            logger.info("Dialogue session completed")
        } catch {
            logger.error("Failed to complete session: \(error)")
        }

        self.sessionId = nil
        selectedCharacter = nil
        exchanges = []
        isActive = false
    }
}
