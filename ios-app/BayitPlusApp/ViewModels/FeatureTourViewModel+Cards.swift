import Foundation

/// Card configuration and i18n key mapping for the feature tour.
extension FeatureTourViewModel {
    static let allCardDefinitions: [(String, Int, String, String)] = [
        ("live_dubbing", 1, "video_toggle", "demo_live_dubbing.mp4"),
        ("live_trivia", 2, "video_toggle", "demo_live_trivia.mp4"),
        ("subtitles_split", 3, "subtitle_toggle", "demo_subtitles_split.mp4"),
        ("engrew_heblish", 4, "subtitle_toggle", "demo_engrew_heblish.mp4"),
        ("pause_and_ask", 5, "interactive_chat", "demo_pause_and_ask.mp4"),
        ("movie_interaction", 6, "interactive_chat", "demo_movie_interaction.mp4"),
        ("zeh_ani", 7, "camera_preview", "demo_zeh_ani.mp4"),
        ("catchup", 8, "timeline_scrub", "demo_catchup.mp4"),
        ("byoc", 9, "step_animation", "demo_byoc.mp4"),
    ]

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

    static func i18nKey(for featureKey: String) -> String {
        i18nKeyMap[featureKey] ?? "onboarding.tour.\(featureKey)"
    }

    static func buildCards(
        from definitions: [(String, Int, String, String)],
        enabledFeatures: Set<String>? = nil
    ) -> [FeatureCard] {
        let filtered = enabledFeatures.map { flags in
            definitions.filter { flags.contains($0.0) }
        } ?? definitions

        return filtered.map { key, order, demoType, video in
            let base = i18nKey(for: key)
            return FeatureCard(
                id: key, featureKey: key, order: order,
                demoType: demoType,
                titleKey: "\(base).title",
                taglineKey: "\(base).tagline",
                descriptionKey: "\(base).description",
                videoAsset: video
            )
        }
    }
}
