import BayitCore
import Foundation
import Observation

/// ViewModel for trivia facts - manages fact loading, active fact tracking, and auto-dismiss.
/// Available on iOS only. Depends on OfflineCacheService.
@MainActor
@Observable
final class TriviaFactsViewModel {
    var facts: [TriviaFact] = []
    var activeFact: TriviaFact?
    var isLoading = false
    var error: String?
    var isEnabled = false
    var isConnected = false

    private let repository: any TriviaRepository
    private let offlineCache: OfflineCacheService
    private var autoDismissTask: Task<Void, Never>?
    private let logger = BayitLogger(category: "TriviaFacts")
    var liveWebSocketService: LiveTriviaWebSocketService?

    /// IDs of facts already shown this session (prevents duplicates).
    private var shownFactIds: Set<String> = []

    /// Last playback time a random fact was shown (for interval gating).
    private var lastRandomFactTime: Double = -.infinity

    /// Interval between random facts (matches web app "normal" frequency = 5 min).
    private let randomFactInterval: TimeInterval = 300.0

    /// Window around a timed trigger to consider a match.
    private let timedDisplayWindow: TimeInterval = 30.0

    init(repository: any TriviaRepository, offlineCache: OfflineCacheService) {
        self.repository = repository
        self.offlineCache = offlineCache
    }

    @MainActor
    func loadFacts(contentId: String, language: String?) async {
        isLoading = true
        error = nil

        let cacheKey = "trivia_\(contentId)_\(language ?? "default")"

        do {
            let response = try await repository.fetchTrivia(
                contentId: contentId,
                language: language ?? "en"
            )
            facts = response.facts
            shownFactIds = []
            lastRandomFactTime = -.infinity

            await offlineCache.save(response, forKey: cacheKey)

            logger.info("Trivia facts loaded", context: [
                "contentId": contentId,
                "factCount": String(facts.count),
            ])
        } catch {
            if let cached = await offlineCache.load(forKey: cacheKey, as: TriviaResponse.self) {
                facts = cached.facts
                shownFactIds = []
                lastRandomFactTime = -.infinity
                logger.info("Using cached trivia facts", context: ["contentId": contentId])
            } else {
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
                logger.error("Failed to load trivia facts", error: error, context: [
                    "contentId": contentId,
                ])
            }
        }

        isLoading = false
    }

    /// Update active fact based on current playback time.
    /// Handles both timed facts (trigger_type=time with trigger_time) and random facts
    /// (shown periodically), matching the web app behavior.
    @MainActor
    func updateActiveFact(currentTime: Double) {
        // Don't interrupt an active fact that's still being displayed
        if activeFact != nil { return }

        // 1. Check timed facts first (highest priority)
        if let timedFact = nextTimedFact(at: currentTime) {
            showFact(timedFact)
            return
        }

        // 2. Show random/untimed facts on interval (web parity)
        let elapsed = currentTime - lastRandomFactTime
        if elapsed >= randomFactInterval, let randomFact = nextRandomFact() {
            lastRandomFactTime = currentTime
            showFact(randomFact)
        }
    }

    @MainActor
    func dismissFact() {
        activeFact = nil
        autoDismissTask?.cancel()
    }

    /// Request a follow-up fact for the current active fact's chain.
    /// Sends a WebSocket message to the live trivia service to fetch the next fact in the chain.
    @MainActor
    func requestFollowUp() {
        guard let fact = activeFact, fact.hasFollowUp == true else { return }

        // Check if next fact in chain is already loaded
        if let chainId = fact.chainId, let nextOrder = fact.chainOrder.map({ $0 + 1 }) {
            if let nextFact = facts.first(where: {
                $0.chainId == chainId && $0.chainOrder == nextOrder
            }) {
                showFact(nextFact)
                return
            }
        }

        // Request via WebSocket if connected
        liveWebSocketService?.requestFollowUp(
            factId: fact.factId,
            chainId: fact.chainId
        )
    }

    @MainActor
    func cleanup() {
        autoDismissTask?.cancel()
        activeFact = nil
        shownFactIds = []
    }

    // MARK: - Fact Selection Helpers

    /// Find a timed fact whose trigger_time is within the display window of the current time.
    private func nextTimedFact(at currentTime: Double) -> TriviaFact? {
        facts.first { fact in
            guard fact.triggerType == "time",
                  let triggerTime = fact.triggerTime,
                  !shownFactIds.contains(fact.id) else { return false }
            return abs(currentTime - triggerTime) <= timedDisplayWindow
        }
    }

    /// Pick the next unshown random/untimed fact (sorted by priority descending).
    private func nextRandomFact() -> TriviaFact? {
        facts
            .filter { !shownFactIds.contains($0.id) }
            .filter { $0.triggerType != "time" || $0.triggerTime == nil }
            .sorted { ($0.priority ?? 5) > ($1.priority ?? 5) }
            .first
    }

    /// Display a fact with auto-dismiss after its configured duration.
    @MainActor
    func showFact(_ fact: TriviaFact) {
        autoDismissTask?.cancel()
        activeFact = fact
        shownFactIds.insert(fact.id)

        let duration = TimeInterval(fact.displayDuration ?? 15)
        autoDismissTask = Task {
            try? await Task.sleep(for: .seconds(duration))
            if !Task.isCancelled {
                self.dismissFact()
            }
        }
    }
}
