import BayitCore
import Foundation
import Observation

/// Engine that fetches proactive voice suggestions from the backend API.
///
/// Polls POST /api/v1/voice/proactive/suggest at the interval returned by
/// the server (`next_poll_seconds`). A minimum client-side interval is also
/// enforced via `minimumInterval` to prevent hammering on rapid restarts.
/// Enforces only one visible suggestion at a time; dismiss clears state and
/// restarts the poll cycle immediately.
@Observable
final class ProactiveSuggestionEngine {
    // MARK: - Public State

    private(set) var currentSuggestion: ProactiveSuggestion?
    private(set) var isActive = false

    // MARK: - Private

    private let repository: any ProactiveSuggestionRepository
    private let platform: String
    private let logger = BayitLogger(category: "ProactiveSuggestionEngine")
    private var pollTask: Task<Void, Never>?
    private var lastSuggestionDate: Date?
    private let minimumInterval: TimeInterval
    private var dismissedContentIds: Set<String> = []

    // MARK: - Init

    init(
        repository: any ProactiveSuggestionRepository,
        platform: String,
        minimumInterval: TimeInterval = ProactiveSuggestionEngine.configuredMinimumInterval
    ) {
        self.repository = repository
        self.platform = platform
        self.minimumInterval = minimumInterval
    }

    // MARK: - Configuration

    private static var configuredMinimumInterval: TimeInterval {
        if let value = ProcessInfo.processInfo.environment["PROACTIVE_MIN_INTERVAL_SECONDS"],
           let interval = TimeInterval(value)
        {
            return interval
        }
        return 300
    }

    // MARK: - Lifecycle

    @MainActor
    func start(profileId: String? = nil) {
        guard !isActive else { return }
        isActive = true
        logger.info("Proactive suggestion engine started", context: ["platform": platform])
        schedulePoll(profileId: profileId, delay: 0)
    }

    @MainActor
    func stop() {
        pollTask?.cancel()
        pollTask = nil
        isActive = false
        currentSuggestion = nil
        logger.info("Proactive suggestion engine stopped")
    }

    @MainActor
    func dismissSuggestion() {
        if let contentId = currentSuggestion?.id {
            dismissedContentIds.insert(contentId)
        }
        lastSuggestionDate = Date()
        currentSuggestion = nil
        logger.info("Suggestion dismissed by user")
    }

    // MARK: - Private Polling

    @MainActor
    private func schedulePoll(profileId: String?, delay: TimeInterval) {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            guard let self else { return }
            if delay > 0 {
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
            guard !Task.isCancelled else { return }
            await self.performPoll(profileId: profileId)
        }
    }

    private func performPoll(profileId: String?) async {
        guard await MainActor.run(body: { isActive }) else { return }

        do {
            let response = try await repository.fetchSuggestions(
                platform: platform,
                profileId: profileId,
                maxSuggestions: 1
            )

            await MainActor.run {
                applyResponse(response)
            }

            let nextInterval = max(
                minimumInterval,
                TimeInterval(response.nextPollSeconds)
            )
            await MainActor.run {
                schedulePoll(profileId: profileId, delay: nextInterval)
            }
        } catch {
            logger.error("Proactive suggestion fetch failed", error: error)
            await MainActor.run {
                schedulePoll(profileId: profileId, delay: minimumInterval)
            }
        }
    }

    @MainActor
    private func applyResponse(_ response: ProactiveSuggestResponse) {
        guard currentSuggestion == nil else { return }

        guard let first = response.suggestions.first,
              let contentId = first.contentId,
              !dismissedContentIds.contains(contentId)
        else {
            return
        }

        let suggestion = ProactiveSuggestion(
            id: contentId,
            type: SuggestionType(rawValue: first.reasonType ?? "") ?? .contextBased,
            message: first.title ?? first.reason,
            action: SuggestionAction(
                type: .content,
                payload: first.contentType.map { ["contentType": $0, "contentId": contentId] }
            ),
            priority: priority(from: first.confidence),
            timestamp: Date().timeIntervalSince1970
        )

        currentSuggestion = suggestion
        lastSuggestionDate = Date()
        logger.info("Suggestion applied", context: [
            "contentId": contentId,
            "reasonType": first.reasonType ?? "unknown",
            "confidence": "\(first.confidence ?? 0)",
        ])
    }

    private func priority(from confidence: Double?) -> SuggestionPriority {
        switch confidence ?? 0 {
        case 0.8...: return .high
        case 0.5 ..< 0.8: return .medium
        default: return .low
        }
    }
}
