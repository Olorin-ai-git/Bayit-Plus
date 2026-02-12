import BayitCore
import Foundation
import Observation

/// ViewModel for the Talk Back voice interaction feature.
/// Manages the state machine for question presentation, voice capture,
/// evaluation, and result display during content playback.
@MainActor
@Observable
final class TalkBackViewModel {

    private(set) var state: TalkBackState = .idle
    private(set) var points: [TalkBackPoint] = []
    private(set) var currentPoint: TalkBackPoint?
    private(set) var lastEvaluation: TalkBackEvaluation?
    private(set) var stats: TalkBackStats?
    private(set) var recentAttempts: [TalkBackAttemptRecord] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any TalkBackRepository
    private let logger = BayitLogger(category: "TalkBack")
    private var triggeredPointIds: Set<String> = []

    init(repository: any TalkBackRepository) {
        self.repository = repository
    }

    // MARK: - Data Loading

    @MainActor
    func loadPoints(contentId: String) async {
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchPoints(contentId: contentId)
            points = response.points
            triggeredPointIds = []
            logger.info("Talk back points loaded", context: [
                "contentId": contentId,
                "count": String(response.points.count)
            ])
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to load talk back points", error: error, context: [
                "contentId": contentId
            ])
        }

        isLoading = false
    }

    @MainActor
    func loadStats(profileId: String) async {
        do {
            stats = try await repository.fetchStats(profileId: profileId)
        } catch {
            logger.error("Failed to load talk back stats", error: error, context: [
                "profileId": profileId
            ])
        }
    }

    @MainActor
    func fetchStats(profileId: String) async {
        await loadStats(profileId: profileId)
    }

    @MainActor
    func fetchHistory(profileId: String, limit: Int = 20) async {
        do {
            let response = try await repository.fetchHistory(profileId: profileId, limit: limit)
            recentAttempts = response.attempts
        } catch {
            logger.error("Failed to load talk back history", error: error, context: [
                "profileId": profileId
            ])
        }
    }

    // MARK: - State Machine

    /// Check if a talk back point should trigger at the given playback time.
    @MainActor
    func checkTrigger(currentTime: Double, tolerance: Double = 1.5) {
        guard state == .idle else { return }

        let match = points.first { point in
            !triggeredPointIds.contains(point.id) &&
            abs(currentTime - point.triggerTime) < tolerance
        }

        if let match {
            presentQuestion(point: match)
        }
    }

    @MainActor
    func presentQuestion(point: TalkBackPoint) {
        triggeredPointIds.insert(point.id)
        currentPoint = point
        state = .question
        lastEvaluation = nil
        logger.info("Presenting talk back question", context: [
            "pointId": point.id,
            "character": point.characterName
        ])
    }

    @MainActor
    func startListening() {
        guard state == .question else { return }
        state = .listening
        logger.info("Listening for voice response")
    }

    @MainActor
    func submitResponse(
        sessionId: String,
        contentId: String,
        profileId: String,
        transcript: String,
        languageDetected: String
    ) async {
        guard let point = currentPoint else { return }
        state = .evaluating

        do {
            let request = TalkBackSubmitRequest(
                sessionId: sessionId,
                contentId: contentId,
                talkBackPointId: point.id,
                profileId: profileId,
                responseTranscript: transcript,
                languageDetected: languageDetected
            )
            lastEvaluation = try await repository.submitResponse(request)
            state = .result
            logger.info("Talk back response evaluated", context: [
                "pointId": point.id,
                "score": String(lastEvaluation?.score ?? 0)
            ])
        } catch {
            self.error = error.localizedDescription
            state = .idle
            logger.error("Failed to submit talk back response", error: error, context: [
                "pointId": point.id
            ])
        }
    }

    @MainActor
    func dismiss() {
        state = .idle
        currentPoint = nil
        lastEvaluation = nil
        error = nil
    }

    @MainActor
    func retryCurrentPoint() {
        guard let point = currentPoint else { return }
        state = .question
        lastEvaluation = nil
        logger.info("Retrying talk back point", context: ["pointId": point.id])
    }

    @MainActor
    func resetAll() {
        state = .idle
        points = []
        currentPoint = nil
        lastEvaluation = nil
        stats = nil
        triggeredPointIds = []
        error = nil
    }
}
