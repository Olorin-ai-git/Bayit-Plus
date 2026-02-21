import BayitCore
import Foundation
import Observation

/// Manages free-form dialogue sessions between user avatar and movie characters.
/// Loads available characters, starts sessions, and sends messages.
/// Multi-character and pause-and-ask logic is in AvatarDialogueViewModel+Dialogue.swift.
@MainActor
@Observable
final class AvatarDialogueViewModel {
    // MARK: - Public State

    var availableCharacters: [ContentCharacter] = []
    var selectedCharacter: ContentCharacter?
    var sessionId: String?
    var exchanges: [DialogueExchange] = []
    var isSending = false
    var isActive = false

    // MARK: - Multi-Character State (Phase 3)

    var multiCharacters: [CharacterProfile] = []
    var isMultiCharacterMode = false
    var addressedCharacterName: String = ""

    // MARK: - Internal (extension access)

    let repository: any AvatarRepository
    let logger = BayitLogger(category: "AvatarDialogueVM")

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
