import BayitAnalytics
import BayitNetworking
import Foundation
import Observation

/// Manages the feature discovery tour state, card navigation, and backend sync.
@MainActor
@Observable
final class FeatureTourViewModel {
    struct FeatureCard: Identifiable {
        let id: String
        let featureKey: String
        let order: Int
        let demoType: String
        let titleKey: String
        let taglineKey: String
        let descriptionKey: String
        let videoAsset: String
    }

    // MARK: - State

    private(set) var cards: [FeatureCard] = []
    var currentIndex: Int = 0
    internal(set) var completionStatus: String = "not_started"
    private(set) var completedCards: Set<String> = []
    private(set) var demoCardsTapped: Set<String> = []
    private(set) var isLoading = false
    var showingDemo: FeatureCard?
    var showPersonalization = false

    let platform: String
    let apiClient: APIClient
    private let analytics: AnalyticsService
    let storageKey: String
    var lastSeenVersion: Int = 0
    static let currentTourVersion = 1

    // MARK: - Computed

    var shouldShowTour: Bool {
        completionStatus == "not_started" || completionStatus == "in_progress"
    }

    var hasNewCards: Bool {
        lastSeenVersion < Self.currentTourVersion
    }

    var isLastCard: Bool {
        currentIndex >= cards.count - 1
    }

    var currentCard: FeatureCard? {
        guard currentIndex < cards.count else { return nil }
        return cards[currentIndex]
    }

    // MARK: - Init

    init(
        apiClient: APIClient,
        analytics: AnalyticsService = AnalyticsService(),
        userId: String,
        platform: String = "ios",
        enabledFeatures: Set<String>? = nil
    ) {
        self.apiClient = apiClient
        self.analytics = analytics
        self.platform = platform
        storageKey = "bayit.onboarding.tour.\(userId)"
        loadLocalState()
        cards = Self.buildCards(
            from: Self.allCardDefinitions,
            enabledFeatures: enabledFeatures
        )
    }

    // MARK: - Navigation

    func advanceToNextCard() {
        guard currentIndex < cards.count - 1 else { return }
        markCardViewed()
        currentIndex += 1
        syncState()
    }

    func goToPreviousCard() {
        guard currentIndex > 0 else { return }
        currentIndex -= 1
    }

    func startTour() {
        completionStatus = "in_progress"
        analytics.logEvent(
            BayitAnalyticsEvent.onboardingTourStart,
            parameters: ["platform": platform]
        )
        syncState()
    }

    func skipTour() {
        completionStatus = "skipped"
        persistLocalState()
        analytics.logEvent(
            BayitAnalyticsEvent.onboardingTourSkip,
            parameters: [
                "platform": platform,
                "last_card": currentCard?.featureKey ?? "",
            ]
        )
        Task { await syncSkip() }
    }

    func completeTour() {
        showPersonalization = true
    }

    func finalizeTour(preferences: [String: Any]? = nil) {
        completionStatus = "completed"
        persistLocalState()
        analytics.logEvent(
            BayitAnalyticsEvent.onboardingTourComplete,
            parameters: ["platform": platform]
        )
        Task { await syncComplete(preferences: preferences) }
    }

    func tapDemo(card: FeatureCard) {
        demoCardsTapped.insert(card.featureKey)
        showingDemo = card
        analytics.logEvent(
            BayitAnalyticsEvent.onboardingDemoTap,
            parameters: ["feature_key": card.featureKey, "platform": platform]
        )
    }

    func dismissDemo() {
        if let card = showingDemo {
            analytics.logEvent(
                BayitAnalyticsEvent.onboardingDemoComplete,
                parameters: ["feature_key": card.featureKey]
            )
        }
        showingDemo = nil
    }

    // MARK: - State Tracking

    private func markCardViewed() {
        guard let card = currentCard else { return }
        completedCards.insert(card.featureKey)
        analytics.logEvent(
            BayitAnalyticsEvent.onboardingCardView,
            parameters: ["feature_key": card.featureKey, "card_index": currentIndex]
        )
    }

    // MARK: - Local Persistence

    func persistLocalState() {
        let state: [String: Any] = [
            "completion_status": completionStatus,
            "current_card_index": currentIndex,
            "completed_cards": Array(completedCards),
            "demo_cards_tapped": Array(demoCardsTapped),
            "last_seen_version": lastSeenVersion,
        ]
        UserDefaults.standard.set(state, forKey: storageKey)
    }

    private func loadLocalState() {
        guard let state = UserDefaults.standard.dictionary(
            forKey: storageKey
        ) else { return }
        completionStatus = state["completion_status"] as? String ?? "not_started"
        currentIndex = state["current_card_index"] as? Int ?? 0
        lastSeenVersion = state["last_seen_version"] as? Int ?? 0
        if let cards = state["completed_cards"] as? [String] {
            completedCards = Set(cards)
        }
        if let demos = state["demo_cards_tapped"] as? [String] {
            demoCardsTapped = Set(demos)
        }
    }
}
