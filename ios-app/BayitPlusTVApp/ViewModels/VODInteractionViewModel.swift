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

    // MARK: - Hardcoded Debug Moments

    func loadHardcodedMoments() {
        moments = [
            InteractiveMoment(
                timestamp: 30.0, duration: 120.0,
                sceneContext: "Hill Valley. Marty meets Jennifer.",
                characterName: "Jennifer Parker",
                characterFrameUrl: nil,
                interactionPrompt: "Hey Jennifer! I think Marty is really cool. Did you know he travels through time?",
                voiceId: "1b5d9589-f5e5-4f05-b063-c82b97b46477",
                dialogueOptions: [],
                lipsyncVideoUrl: "https://s3.us-west-2.amazonaws.com/remotionlambda-uswest2-30tewi8y5c/renders/y8vtr380rb/output.mp4"
            ),
            InteractiveMoment(
                timestamp: 1630.0, duration: 45.0,
                sceneContext: "Twin Pines Mall. Doc unveils the DeLorean.",
                characterName: "Doc Brown",
                characterFrameUrl: nil,
                interactionPrompt: "Wow Doc Brown, the time machine is amazing! Can I try it?",
                voiceId: "1b5d9589-f5e5-4f05-b063-c82b97b46477",
                dialogueOptions: [],
                lipsyncVideoUrl: nil
            ),
        ]
        logger.warning("Loaded \(moments.count) hardcoded moments")
    }

    // MARK: - Load Moments from API

    func loadMoments(contentId: String) async {
        do {
            moments = try await repository.fetchInteractiveMoments(
                contentId: contentId
            )
            logger.warning(
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
                    logger.warning(
                        "Skipping moment at \(moment.timestamp)s - no video"
                    )
                    continue
                }
                triggeredTimestamps.insert(moment.timestamp)
                activeMoment = moment
                phase = .playing
                logger.warning(
                    "Triggered moment: \(moment.characterName) at \(moment.timestamp)s"
                )
                return true
            }
        }
        return false
    }

    // MARK: - Lifecycle

    func dismiss() {
        logger.warning("Moment dismissed")
        activeMoment = nil
        phase = .idle
    }
}
