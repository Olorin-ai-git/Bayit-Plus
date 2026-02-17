import BayitCore
import Foundation
import Observation

/// Manages VOD interactive moment detection and avatar lip-sync video playback.
/// When playback reaches a moment timestamp, the avatar's pre-generated
/// lip-sync video plays in a PiP overlay alongside the movie.
@MainActor
@Observable
final class VODInteractionViewModel {

    enum Phase {
        case idle
        case playing
    }

    // MARK: - Public State

    private(set) var moments: [InteractiveMoment] = []
    private(set) var activeMoment: InteractiveMoment?
    private(set) var phase: Phase = .idle

    // MARK: - Private

    private var triggeredTimestamps: Set<Double> = []
    private let repository: any AvatarRepository
    private let logger = BayitLogger(category: "VODInteractionVM")

    init(repository: any AvatarRepository) {
        self.repository = repository
    }

    // MARK: - Load Moments from API

    func loadMoments(contentId: String) async {
        do {
            moments = try await repository.fetchInteractiveMoments(
                contentId: contentId
            )
            logger.info(
                "Loaded \(moments.count) interactive moments from API"
            )
        } catch {
            logger.error("Failed to load moments: \(error)")
            moments = []
        }
    }

    // MARK: - Timestamp Detection

    /// Checks if playback reached an interactive moment with a video.
    /// Returns `true` if a moment was triggered (caller shows overlay).
    func checkForMoment(currentTime: Double) -> Bool {
        guard phase == .idle else { return false }

        for moment in moments {
            let windowEnd = moment.timestamp + moment.duration
            let inWindow = currentTime >= moment.timestamp
                && currentTime <= windowEnd

            if inWindow, !triggeredTimestamps.contains(moment.timestamp) {
                guard moment.lipsyncVideoUrl != nil else {
                    triggeredTimestamps.insert(moment.timestamp)
                    logger.info(
                        "Skipping moment at \(moment.timestamp)s - no video"
                    )
                    continue
                }
                triggeredTimestamps.insert(moment.timestamp)
                activeMoment = moment
                phase = .playing
                logger.info(
                    "Triggered: \(moment.characterName) at \(moment.timestamp)s"
                )
                return true
            }
        }
        return false
    }

    // MARK: - Lifecycle

    func dismiss() {
        logger.info("Moment dismissed")
        activeMoment = nil
        phase = .idle
    }
}
