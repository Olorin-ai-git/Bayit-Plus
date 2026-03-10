import Foundation

public enum DiscoverFeatureCatalog {
    static let bothPlatforms: Set<Platform> = [.iOS, .tvOS]
    static let iOSOnly: Set<Platform> = [.iOS]

    public static let allFeatures: [DiscoverFeature] =
        movieFeatures + liveTVFeatures + hebrewFeatures + searchFeatures + chatFeatures

    public static func features(for category: DiscoverCategory) -> [DiscoverFeature] {
        allFeatures.filter { $0.category == category }
    }

    public static func feature(byId id: String) -> DiscoverFeature? {
        allFeatures.first { $0.id == id }
    }
}

// MARK: - While Watching Movies

extension DiscoverFeatureCatalog {
    static let movieFeatures: [DiscoverFeature] = [
        DiscoverFeature(
            id: "pause_ask",
            category: .watchingMovies,
            nameKey: "discover.feature.pause_ask.name",
            taglineKey: "discover.feature.pause_ask.tagline",
            descriptionKey: "discover.feature.pause_ask.description",
            iconName: "person.bubble",
            platforms: bothPlatforms,
            prerequisites: [
                FeaturePrerequisite(id: "pause_ask_avatar", type: .avatar, labelKey: "discover.prereq.avatar_required", fixRoute: "bayitplus://settings/avatar"),
                FeaturePrerequisite(id: "pause_ask_preference", type: .preference, labelKey: "discover.prereq.preference_required", fixRoute: "bayitplus://settings/playback"),
                FeaturePrerequisite(id: "pause_ask_contentType", type: .contentType, labelKey: "discover.prereq.contentType_required"),
            ],
            walkthroughSteps: makeSteps(featureId: "pause_ask", actions: [.navigate, .pause, .tap, .observe]),
            deepLinkRoute: "bayitplus://play/"
        ),
        DiscoverFeature(
            id: "interactive_subtitles",
            category: .watchingMovies,
            nameKey: "discover.feature.interactive_subtitles.name",
            taglineKey: "discover.feature.interactive_subtitles.tagline",
            descriptionKey: "discover.feature.interactive_subtitles.description",
            iconName: "captions.bubble",
            platforms: bothPlatforms,
            prerequisites: [
                FeaturePrerequisite(id: "interactive_subtitles_preference", type: .preference, labelKey: "discover.prereq.preference_required", fixRoute: "bayitplus://settings/subtitles"),
            ],
            walkthroughSteps: makeSteps(featureId: "interactive_subtitles", actions: [.navigate, .tap, .select, .observe]),
            deepLinkRoute: "bayitplus://play/"
        ),
        DiscoverFeature(
            id: "vocabulary",
            category: .watchingMovies,
            nameKey: "discover.feature.vocabulary.name",
            taglineKey: "discover.feature.vocabulary.tagline",
            descriptionKey: "discover.feature.vocabulary.description",
            iconName: "textformat.abc",
            platforms: bothPlatforms,
            prerequisites: [
                FeaturePrerequisite(id: "vocabulary_preference", type: .preference, labelKey: "discover.prereq.preference_required", fixRoute: "bayitplus://settings/subtitles"),
            ],
            walkthroughSteps: makeSteps(featureId: "vocabulary", actions: [.navigate, .tap, .select, .observe])
        ),
        DiscoverFeature(
            id: "vod_moments",
            category: .watchingMovies,
            nameKey: "discover.feature.vod_moments.name",
            taglineKey: "discover.feature.vod_moments.tagline",
            descriptionKey: "discover.feature.vod_moments.description",
            iconName: "sparkles.rectangle.stack",
            platforms: iOSOnly,
            prerequisites: [
                FeaturePrerequisite(id: "vod_moments_avatar", type: .avatar, labelKey: "discover.prereq.avatar_required", fixRoute: "bayitplus://settings/avatar"),
                FeaturePrerequisite(id: "vod_moments_contentType", type: .contentType, labelKey: "discover.prereq.contentType_required"),
            ],
            walkthroughSteps: makeSteps(featureId: "vod_moments", actions: [.navigate, .tap, .observe]),
            deepLinkRoute: "bayitplus://play/"
        ),
        DiscoverFeature(
            id: "cultural_context",
            category: .watchingMovies,
            nameKey: "discover.feature.cultural_context.name",
            taglineKey: "discover.feature.cultural_context.tagline",
            descriptionKey: "discover.feature.cultural_context.description",
            iconName: "globe.americas",
            platforms: iOSOnly,
            prerequisites: [
                FeaturePrerequisite(id: "cultural_context_contentType", type: .contentType, labelKey: "discover.prereq.contentType_required"),
            ],
            walkthroughSteps: makeSteps(featureId: "cultural_context", actions: [.navigate, .tap, .observe])
        ),
        DiscoverFeature(
            id: "bilingual_bridge",
            category: .watchingMovies,
            nameKey: "discover.feature.bilingual_bridge.name",
            taglineKey: "discover.feature.bilingual_bridge.tagline",
            descriptionKey: "discover.feature.bilingual_bridge.description",
            iconName: "character.book.closed.fill",
            platforms: bothPlatforms,
            prerequisites: [
                FeaturePrerequisite(id: "bilingual_bridge_contentType", type: .contentType, labelKey: "discover.prereq.contentType_required"),
            ],
            walkthroughSteps: makeSteps(featureId: "bilingual_bridge", actions: [.navigate, .select, .tap, .observe]),
            deepLinkRoute: "bayitplus://play/"
        ),
        DiscoverFeature(
            id: "ai_companion",
            category: .watchingMovies,
            nameKey: "discover.feature.ai_companion.name",
            taglineKey: "discover.feature.ai_companion.tagline",
            descriptionKey: "discover.feature.ai_companion.description",
            iconName: "brain.head.profile",
            platforms: iOSOnly,
            prerequisites: [
                FeaturePrerequisite(id: "ai_companion_contentType", type: .contentType, labelKey: "discover.prereq.contentType_required"),
            ],
            walkthroughSteps: makeSteps(featureId: "ai_companion", actions: [.navigate, .tap, .type, .observe]),
            deepLinkRoute: "bayitplus://play/"
        ),
    ]

    // MARK: - While Watching Live TV

    static let liveTVFeatures: [DiscoverFeature] = [
        DiscoverFeature(
            id: "live_dubbing",
            category: .watchingLiveTV,
            nameKey: "discover.feature.live_dubbing.name",
            taglineKey: "discover.feature.live_dubbing.tagline",
            descriptionKey: "discover.feature.live_dubbing.description",
            iconName: "waveform.and.mic",
            platforms: bothPlatforms,
            prerequisites: [
                FeaturePrerequisite(id: "live_dubbing_subscription", type: .subscription, labelKey: "discover.prereq.subscription_required", fixRoute: "bayitplus://subscribe"),
            ],
            walkthroughSteps: makeSteps(featureId: "live_dubbing", actions: [.navigate, .tap, .select, .observe]),
            deepLinkRoute: "bayitplus://live"
        ),
        DiscoverFeature(
            id: "live_subtitles",
            category: .watchingLiveTV,
            nameKey: "discover.feature.live_subtitles.name",
            taglineKey: "discover.feature.live_subtitles.tagline",
            descriptionKey: "discover.feature.live_subtitles.description",
            iconName: "text.bubble",
            platforms: bothPlatforms,
            prerequisites: [
                FeaturePrerequisite(id: "live_subtitles_subscription", type: .subscription, labelKey: "discover.prereq.subscription_required", fixRoute: "bayitplus://subscribe"),
            ],
            walkthroughSteps: makeSteps(featureId: "live_subtitles", actions: [.navigate, .tap, .select, .observe]),
            deepLinkRoute: "bayitplus://live"
        ),
        DiscoverFeature(
            id: "live_trivia",
            category: .watchingLiveTV,
            nameKey: "discover.feature.live_trivia.name",
            taglineKey: "discover.feature.live_trivia.tagline",
            descriptionKey: "discover.feature.live_trivia.description",
            iconName: "questionmark.circle",
            platforms: bothPlatforms,
            prerequisites: [
                FeaturePrerequisite(id: "live_trivia_contentType", type: .contentType, labelKey: "discover.prereq.contentType_required"),
            ],
            walkthroughSteps: makeSteps(featureId: "live_trivia", actions: [.navigate, .tap, .observe]),
            deepLinkRoute: "bayitplus://live"
        ),
        DiscoverFeature(
            id: "catch_up",
            category: .watchingLiveTV,
            nameKey: "discover.feature.catch_up.name",
            taglineKey: "discover.feature.catch_up.tagline",
            descriptionKey: "discover.feature.catch_up.description",
            iconName: "clock.arrow.circlepath",
            platforms: bothPlatforms,
            prerequisites: [
                FeaturePrerequisite(id: "catch_up_subscription", type: .subscription, labelKey: "discover.prereq.subscription_required", fixRoute: "bayitplus://subscribe"),
                FeaturePrerequisite(id: "catch_up_contentType", type: .contentType, labelKey: "discover.prereq.contentType_required"),
            ],
            walkthroughSteps: makeSteps(featureId: "catch_up", actions: [.navigate, .select, .tap, .observe]),
            deepLinkRoute: "bayitplus://live"
        ),
        DiscoverFeature(
            id: "scene_search",
            category: .watchingLiveTV,
            nameKey: "discover.feature.scene_search.name",
            taglineKey: "discover.feature.scene_search.tagline",
            descriptionKey: "discover.feature.scene_search.description",
            iconName: "magnifyingglass.circle",
            platforms: bothPlatforms,
            prerequisites: [
                FeaturePrerequisite(id: "scene_search_contentType", type: .contentType, labelKey: "discover.prereq.contentType_required"),
            ],
            walkthroughSteps: makeSteps(featureId: "scene_search", actions: [.navigate, .type, .tap, .observe]),
            deepLinkRoute: "bayitplus://live"
        ),
    ]
}
