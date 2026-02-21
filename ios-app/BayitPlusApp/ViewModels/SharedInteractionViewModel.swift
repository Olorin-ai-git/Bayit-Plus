import BayitCore
import Foundation
import Observation

/// Manages shared interactive sessions within watch parties.
/// Handles turn-based interaction, participant tracking, and event processing.
@MainActor
@Observable
final class SharedInteractionViewModel {
    // MARK: - Public State

    private(set) var sessionId: String?
    private(set) var participants: [SharedParticipant] = []
    private(set) var currentTurnUserId: String?
    private(set) var exchanges: [DialogueExchange] = []
    private(set) var turnsCompleted = 0
    private(set) var maxTurnsPerParticipant = 3
    private(set) var isSending = false
    private(set) var isActive = false
    private(set) var turnCountdown: Int?
    private(set) var characterName: String = ""

    var isMyTurn: Bool {
        currentTurnUserId == currentUserId
    }

    // MARK: - Private

    private let repository: any AvatarRepository
    private let logger = BayitLogger(category: "SharedInteractionVM")
    private var currentUserId: String = ""
    private var partyId: String = ""
    private var countdownTask: Task<Void, Never>?
    private var refreshTask: Task<Void, Never>?

    init(repository: any AvatarRepository) {
        self.repository = repository
    }

    // MARK: - Start Session

    func startSharedInteraction(
        partyId: String,
        contentId: String,
        momentTimestamp: Double,
        characterName: String,
        userId: String,
        profileId: String,
        avatarId: String,
        displayName: String
    ) async {
        self.partyId = partyId
        currentUserId = userId
        self.characterName = characterName

        do {
            let response = try await repository.startSharedInteraction(
                partyId: partyId,
                contentId: contentId,
                momentTimestamp: momentTimestamp,
                characterName: characterName,
                profileId: profileId,
                avatarId: avatarId,
                displayName: displayName
            )
            sessionId = response.id
            isActive = true
            exchanges = []
            logger.info("Shared interaction started: \(response.id)")
        } catch {
            logger.error("Failed to start shared interaction: \(error)")
        }
    }

    // MARK: - Send Message

    func sendMessage(
        _ text: String,
        addressedCharacter: String? = nil
    ) async {
        guard let sessionId, isActive, isMyTurn else { return }
        isSending = true
        defer { isSending = false }

        do {
            let response = try await repository.sendSharedMessage(
                partyId: partyId,
                sessionId: sessionId,
                message: text,
                addressedCharacter: addressedCharacter
            )

            let userExchange = DialogueExchange(
                speaker: "user",
                messageText: text,
                audioUrl: nil,
                animatedVideoUrl: nil,
                characterName: nil,
                addressedTo: addressedCharacter,
                reactionTo: nil,
                participantUserId: currentUserId,
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

            logger.info("Shared message sent")
        } catch {
            logger.error("Failed to send shared message: \(error)")
        }
    }

    // MARK: - Handle Events

    func handleInteractionEvent(_ event: [String: Any]) {
        guard let eventType = event["event"] as? String else { return }

        switch eventType {
        case "turn_change":
            currentTurnUserId = event["current_turn_user_id"] as? String
            turnsCompleted = event["turns_completed"] as? Int ?? turnsCompleted
            startCountdown()
        case "turn_skipped":
            currentTurnUserId = event["next_user_id"] as? String
            startCountdown()
        case "turn_warning":
            turnCountdown = event["seconds_remaining"] as? Int
        case "participant_joined":
            refreshState()
        case "interaction_end":
            isActive = false
            countdownTask?.cancel()
        default:
            break
        }
    }

    // MARK: - End Session

    func endSharedInteraction() async {
        guard let sessionId else { return }
        do {
            _ = try await repository.endSharedInteraction(
                partyId: partyId,
                sessionId: sessionId
            )
            isActive = false
            countdownTask?.cancel()
            logger.info("Shared interaction ended")
        } catch {
            logger.error("Failed to end shared interaction: \(error)")
        }
    }

    // MARK: - Private

    private func startCountdown() {
        countdownTask?.cancel()
        turnCountdown = nil
    }

    private func refreshState() {
        guard let sessionId else { return }
        refreshTask = Task {
            do {
                let state = try await repository.getSharedInteractionState(
                    partyId: partyId,
                    sessionId: sessionId
                )
                participants = state.participants
                currentTurnUserId = state.currentTurnUserId
                turnsCompleted = state.turnsCompleted
                maxTurnsPerParticipant = state.maxTurnsPerParticipant
            } catch {
                logger.error("Failed to refresh state: \(error)")
            }
        }
    }
}
