import BayitAnalytics
import BayitNetworking
import Foundation
import Observation

/// tvOS feature tour ViewModel. Uses pre-rendered video for Zeh Ani
/// since Apple TV has no camera.
@MainActor
@Observable
final class TVFeatureTourViewModel {
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
    var showingDemo: FeatureCard?

    let platform = "tvos"
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
        userId: String
    ) {
        self.apiClient = apiClient
        self.analytics = analytics
        storageKey = "bayit.onboarding.tour.tv.\(userId)"
        loadLocalState()
        buildCardList()
    }

    private func buildCardList() {
        let defs: [(String, Int, String, String)] = [
            ("live_dubbing", 1, "video_toggle", "demo_live_dubbing.mp4"),
            ("live_trivia", 2, "video_toggle", "demo_live_trivia.mp4"),
            ("subtitles_split", 3, "subtitle_toggle", "demo_subtitles_split.mp4"),
            ("engrew_heblish", 4, "subtitle_toggle", "demo_engrew_heblish.mp4"),
            ("pause_and_ask", 5, "interactive_chat", "demo_pause_and_ask.mp4"),
            ("movie_interaction", 6, "interactive_chat", "demo_movie_interaction.mp4"),
            ("zeh_ani", 7, "video_only", "demo_zeh_ani.mp4"),
            ("catchup", 8, "timeline_scrub", "demo_catchup.mp4"),
            ("byoc", 9, "step_animation", "demo_byoc.mp4"),
        ]
        cards = defs.map { key, order, demoType, video in
            let base = Self.i18nKeyMap[key] ?? "onboarding.tour.\(key)"
            return FeatureCard(
                id: key, featureKey: key, order: order,
                demoType: demoType, titleKey: "\(base).title",
                taglineKey: "\(base).tagline",
                descriptionKey: "\(base).description",
                videoAsset: video
            )
        }
    }

    static let i18nKeyMap: [String: String] = [
        "live_dubbing": "onboarding.tour.dubbing",
        "live_trivia": "onboarding.tour.trivia",
        "subtitles_split": "onboarding.tour.subtitles",
        "engrew_heblish": "onboarding.tour.engrew",
        "pause_and_ask": "onboarding.tour.pauseAndAsk",
        "movie_interaction": "onboarding.tour.interaction",
        "zeh_ani": "onboarding.tour.zehAni",
        "catchup": "onboarding.tour.catchup",
        "byoc": "onboarding.tour.byoc",
    ]

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
            parameters: ["platform": platform, "last_card": currentCard?.featureKey ?? ""]
        )
        Task { await syncSkip() }
    }

    func finalizeTour() {
        completionStatus = "completed"
        persistLocalState()
        analytics.logEvent(
            BayitAnalyticsEvent.onboardingTourComplete,
            parameters: ["platform": platform]
        )
        Task { await syncComplete() }
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
            analytics.logEvent(BayitAnalyticsEvent.onboardingDemoComplete, parameters: ["feature_key": card.featureKey])
        }
        showingDemo = nil
    }

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
            "completion_status": completionStatus, "current_card_index": currentIndex,
            "completed_cards": Array(completedCards), "demo_cards_tapped": Array(demoCardsTapped),
            "last_seen_version": lastSeenVersion,
        ]
        UserDefaults.standard.set(state, forKey: storageKey)
    }

    private func loadLocalState() {
        guard let state = UserDefaults.standard.dictionary(forKey: storageKey) else { return }
        completionStatus = state["completion_status"] as? String ?? "not_started"
        currentIndex = state["current_card_index"] as? Int ?? 0
        lastSeenVersion = state["last_seen_version"] as? Int ?? 0
        if let c = state["completed_cards"] as? [String] { completedCards = Set(c) }
        if let d = state["demo_cards_tapped"] as? [String] { demoCardsTapped = Set(d) }
    }
}
