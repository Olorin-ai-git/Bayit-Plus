package tv.bayit.plus.feature.onboarding

import tv.bayit.plus.feature.onboarding.R

/**
 * Local representation of a feature tour card with string resource references.
 * The 9 cards match the backend FEATURE_CARDS list exactly.
 */
data class FeatureCard(
    val featureKey: String,
    val order: Int,
    val demoType: DemoType,
    val titleResId: Int,
    val taglineResId: Int,
)

enum class DemoType {
    VIDEO_TOGGLE,
    SUBTITLE_TOGGLE,
    INTERACTIVE_CHAT,
    CAMERA_PREVIEW,
    TIMELINE_SCRUB,
    STEP_ANIMATION,
}

/**
 * Builds the ordered list of feature cards for the Android platform.
 * Order and keys match backend/app/services/onboarding_tour_service.py FEATURE_CARDS.
 */
fun buildFeatureCards(): List<FeatureCard> = listOf(
    FeatureCard(
        featureKey = "live_dubbing",
        order = 1,
        demoType = DemoType.VIDEO_TOGGLE,
        titleResId = R.string.tour_card_live_dubbing_title,
        taglineResId = R.string.tour_card_live_dubbing_tagline,
    ),
    FeatureCard(
        featureKey = "live_trivia",
        order = 2,
        demoType = DemoType.VIDEO_TOGGLE,
        titleResId = R.string.tour_card_live_trivia_title,
        taglineResId = R.string.tour_card_live_trivia_tagline,
    ),
    FeatureCard(
        featureKey = "subtitles_split",
        order = 3,
        demoType = DemoType.SUBTITLE_TOGGLE,
        titleResId = R.string.tour_card_subtitles_split_title,
        taglineResId = R.string.tour_card_subtitles_split_tagline,
    ),
    FeatureCard(
        featureKey = "engrew_heblish",
        order = 4,
        demoType = DemoType.SUBTITLE_TOGGLE,
        titleResId = R.string.tour_card_engrew_heblish_title,
        taglineResId = R.string.tour_card_engrew_heblish_tagline,
    ),
    FeatureCard(
        featureKey = "pause_and_ask",
        order = 5,
        demoType = DemoType.INTERACTIVE_CHAT,
        titleResId = R.string.tour_card_pause_and_ask_title,
        taglineResId = R.string.tour_card_pause_and_ask_tagline,
    ),
    FeatureCard(
        featureKey = "movie_interaction",
        order = 6,
        demoType = DemoType.INTERACTIVE_CHAT,
        titleResId = R.string.tour_card_movie_interaction_title,
        taglineResId = R.string.tour_card_movie_interaction_tagline,
    ),
    FeatureCard(
        featureKey = "zeh_ani",
        order = 7,
        demoType = DemoType.CAMERA_PREVIEW,
        titleResId = R.string.tour_card_zeh_ani_title,
        taglineResId = R.string.tour_card_zeh_ani_tagline,
    ),
    FeatureCard(
        featureKey = "catchup",
        order = 8,
        demoType = DemoType.TIMELINE_SCRUB,
        titleResId = R.string.tour_card_catchup_title,
        taglineResId = R.string.tour_card_catchup_tagline,
    ),
    FeatureCard(
        featureKey = "byoc",
        order = 9,
        demoType = DemoType.STEP_ANIMATION,
        titleResId = R.string.tour_card_byoc_title,
        taglineResId = R.string.tour_card_byoc_tagline,
    ),
)
