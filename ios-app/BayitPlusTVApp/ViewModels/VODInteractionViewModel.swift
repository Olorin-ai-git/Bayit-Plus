import BayitCore
import Foundation
import Observation

/// Manages VOD interactive moment detection and character conversation sessions.
@MainActor
@Observable
final class VODInteractionViewModel {

    enum Phase {
        case idle
        case prompting
        case processing
        case responding
        case done
    }

    // MARK: - Public State

    private(set) var moments: [InteractiveMoment] = []
    private(set) var activeMoment: InteractiveMoment?
    private(set) var sessionId: String?
    private(set) var characterResponse: CharacterResponsePayload?
    private(set) var phase: Phase = .idle
    private(set) var error: String?

    // MARK: - Private

    private var triggeredTimestamps: Set<Double> = []
    private let repository: any AvatarRepository
    private let logger = BayitLogger(category: "VODInteractionVM")

    init(repository: any AvatarRepository) {
        self.repository = repository
    }

    // MARK: - Load Moments

    func loadMoments(contentId: String) async {
        do {
            moments = try await repository.fetchInteractiveMoments(
                contentId: contentId
            )
            logger.info(
                "Loaded \(moments.count) interactive moments"
            )
        } catch {
            logger.error("Failed to load moments: \(error)")
            moments = []
        }
    }

    // MARK: - Timestamp Detection

    /// Checks if playback has reached an interactive moment.
    /// Returns `true` if a moment was triggered (caller should pause).
    func checkForMoment(currentTime: Double) -> Bool {
        guard phase == .idle else { return false }

        for moment in moments {
            let windowEnd = moment.timestamp + moment.duration
            let inWindow = currentTime >= moment.timestamp
                && currentTime <= windowEnd

            if inWindow, !triggeredTimestamps.contains(moment.timestamp) {
                triggeredTimestamps.insert(moment.timestamp)
                activeMoment = moment
                phase = .prompting
                logger.info(
                    "Triggered moment: \(moment.characterName) at \(moment.timestamp)s"
                )
                return true
            }
        }
        return false
    }

    // MARK: - Session Lifecycle

    func startSession(
        profileId: String,
        avatarId: String,
        contentId: String
    ) async {
        guard let moment = activeMoment else { return }
        phase = .processing
        error = nil

        do {
            let session = try await repository.startInteractionSession(
                profileId: profileId,
                avatarId: avatarId,
                contentId: contentId,
                timestamp: moment.timestamp
            )
            sessionId = session.id
            logger.info("Session started: \(session.id)")
        } catch {
            logger.error("Failed to start session: \(error)")
            self.error = error.localizedDescription
            phase = .prompting
        }
    }

    func sendMessage(_ message: String) async {
        guard let sid = sessionId else { return }
        phase = .processing
        error = nil

        do {
            let response = try await repository.sendInteractionMessage(
                sessionId: sid,
                message: message
            )
            characterResponse = response
            phase = .responding
            logger.info(
                "Character responded: \(response.characterName)"
            )
        } catch {
            logger.error("Failed to send message: \(error)")
            self.error = error.localizedDescription
            phase = .prompting
        }
    }

    func completeSession() async {
        guard let sid = sessionId else {
            resetState()
            return
        }

        do {
            _ = try await repository.completeInteractionSession(
                sessionId: sid
            )
            logger.info("Session completed: \(sid)")
        } catch {
            logger.error("Failed to complete session: \(error)")
        }

        resetState()
    }

    func dismiss() {
        logger.info("Moment dismissed by user")
        resetState()
    }

    func finishResponse() {
        phase = .done
    }

    // MARK: - Private

    private func resetState() {
        activeMoment = nil
        sessionId = nil
        characterResponse = nil
        error = nil
        phase = .idle
    }
}
