package tv.bayit.plus.feature.discover.model

import tv.bayit.plus.feature.discover.model.DiscoverCategory.WATCHING_LIVE_TV
import tv.bayit.plus.feature.discover.model.DiscoverCategory.WATCHING_MOVIES
import tv.bayit.plus.feature.discover.model.DiscoverPlatform.ANDROID
import tv.bayit.plus.feature.discover.model.DiscoverPlatform.IOS
import tv.bayit.plus.feature.discover.model.DiscoverPlatform.TVOS
import tv.bayit.plus.feature.discover.model.PrerequisiteType.AVATAR
import tv.bayit.plus.feature.discover.model.PrerequisiteType.CONTENT_TYPE
import tv.bayit.plus.feature.discover.model.PrerequisiteType.MICROPHONE
import tv.bayit.plus.feature.discover.model.PrerequisiteType.SUBSCRIPTION
import tv.bayit.plus.feature.discover.model.PrerequisiteType.VOICE_CLONE

private val allPlatforms = setOf(IOS, TVOS, ANDROID)
private val mobileOnly = setOf(IOS, ANDROID)

internal val movieFeatures = listOf(
    DiscoverFeature(
        id = "pause_ask", category = WATCHING_MOVIES,
        nameKey = "discover.feature.pause_ask.name",
        taglineKey = "discover.feature.pause_ask.tagline",
        descriptionKey = "discover.feature.pause_ask.description",
        iconName = "pause_circle", platforms = allPlatforms,
        prerequisites = listOf(
            FeaturePrerequisite("avatar", AVATAR, "discover.prereq.avatar", "zeh_ani"),
        ),
        walkthroughSteps = listOf(
            WalkthroughStep("pa1", "discover.walkthrough.pause_ask.1", "player_pause", WalkthroughAction.PAUSE, 0),
            WalkthroughStep("pa2", "discover.walkthrough.pause_ask.2", "ask_button", WalkthroughAction.TAP, 1),
            WalkthroughStep("pa3", "discover.walkthrough.pause_ask.3", "chat_input", WalkthroughAction.TYPE, 2),
        ),
        deepLinkRoute = "player",
    ),
    DiscoverFeature(
        id = "interactive_subtitles", category = WATCHING_MOVIES,
        nameKey = "discover.feature.interactive_subtitles.name",
        taglineKey = "discover.feature.interactive_subtitles.tagline",
        descriptionKey = "discover.feature.interactive_subtitles.description",
        iconName = "subtitles", platforms = allPlatforms,
        prerequisites = listOf(
            FeaturePrerequisite("content", CONTENT_TYPE, "discover.prereq.hebrewContent"),
        ),
        walkthroughSteps = listOf(
            WalkthroughStep("is1", "discover.walkthrough.interactive_subtitles.1", "subtitle_word", WalkthroughAction.TAP, 0),
            WalkthroughStep("is2", "discover.walkthrough.interactive_subtitles.2", "word_card", WalkthroughAction.OBSERVE, 1),
        ),
        deepLinkRoute = "player",
    ),
    DiscoverFeature(
        id = "vocabulary", category = WATCHING_MOVIES,
        nameKey = "discover.feature.vocabulary.name",
        taglineKey = "discover.feature.vocabulary.tagline",
        descriptionKey = "discover.feature.vocabulary.description",
        iconName = "book", platforms = mobileOnly,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("v1", "discover.walkthrough.vocabulary.1", "vocab_tab", WalkthroughAction.TAP, 0),
            WalkthroughStep("v2", "discover.walkthrough.vocabulary.2", "word_list", WalkthroughAction.OBSERVE, 1),
        ),
    ),
    DiscoverFeature(
        id = "vod_moments", category = WATCHING_MOVIES,
        nameKey = "discover.feature.vod_moments.name",
        taglineKey = "discover.feature.vod_moments.tagline",
        descriptionKey = "discover.feature.vod_moments.description",
        iconName = "auto_awesome", platforms = allPlatforms,
        prerequisites = listOf(
            FeaturePrerequisite("sub", SUBSCRIPTION, "discover.prereq.subscription"),
        ),
        walkthroughSteps = listOf(
            WalkthroughStep("vm1", "discover.walkthrough.vod_moments.1", "moments_icon", WalkthroughAction.TAP, 0),
        ),
        deepLinkRoute = "player",
    ),
    DiscoverFeature(
        id = "cultural_context", category = WATCHING_MOVIES,
        nameKey = "discover.feature.cultural_context.name",
        taglineKey = "discover.feature.cultural_context.tagline",
        descriptionKey = "discover.feature.cultural_context.description",
        iconName = "public", platforms = allPlatforms,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("cc1", "discover.walkthrough.cultural_context.1", "culture_badge", WalkthroughAction.TAP, 0),
        ),
        deepLinkRoute = "player",
    ),
    DiscoverFeature(
        id = "bilingual_bridge", category = WATCHING_MOVIES,
        nameKey = "discover.feature.bilingual_bridge.name",
        taglineKey = "discover.feature.bilingual_bridge.tagline",
        descriptionKey = "discover.feature.bilingual_bridge.description",
        iconName = "translate", platforms = allPlatforms,
        prerequisites = listOf(
            FeaturePrerequisite("sub", SUBSCRIPTION, "discover.prereq.subscription"),
            FeaturePrerequisite("voice", VOICE_CLONE, "discover.prereq.voiceClone", "voice_settings"),
        ),
        walkthroughSteps = listOf(
            WalkthroughStep("bb1", "discover.walkthrough.bilingual_bridge.1", "dub_toggle", WalkthroughAction.TAP, 0),
        ),
        deepLinkRoute = "player",
    ),
    DiscoverFeature(
        id = "ai_companion", category = WATCHING_MOVIES,
        nameKey = "discover.feature.ai_companion.name",
        taglineKey = "discover.feature.ai_companion.tagline",
        descriptionKey = "discover.feature.ai_companion.description",
        iconName = "smart_toy", platforms = mobileOnly,
        prerequisites = listOf(
            FeaturePrerequisite("avatar", AVATAR, "discover.prereq.avatar", "zeh_ani"),
        ),
        walkthroughSteps = listOf(
            WalkthroughStep("ac1", "discover.walkthrough.ai_companion.1", "companion_fab", WalkthroughAction.TAP, 0),
        ),
        deepLinkRoute = "player",
    ),
)

internal val liveTVFeatures = listOf(
    DiscoverFeature(
        id = "live_dubbing", category = WATCHING_LIVE_TV,
        nameKey = "discover.feature.live_dubbing.name",
        taglineKey = "discover.feature.live_dubbing.tagline",
        descriptionKey = "discover.feature.live_dubbing.description",
        iconName = "record_voice_over", platforms = allPlatforms,
        prerequisites = listOf(
            FeaturePrerequisite("sub", SUBSCRIPTION, "discover.prereq.subscription"),
        ),
        walkthroughSteps = listOf(
            WalkthroughStep("ld1", "discover.walkthrough.live_dubbing.1", "dub_button", WalkthroughAction.TAP, 0),
        ),
        deepLinkRoute = "live_tv",
    ),
    DiscoverFeature(
        id = "live_subtitles", category = WATCHING_LIVE_TV,
        nameKey = "discover.feature.live_subtitles.name",
        taglineKey = "discover.feature.live_subtitles.tagline",
        descriptionKey = "discover.feature.live_subtitles.description",
        iconName = "closed_caption", platforms = allPlatforms,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("ls1", "discover.walkthrough.live_subtitles.1", "cc_button", WalkthroughAction.TAP, 0),
        ),
        deepLinkRoute = "live_tv",
    ),
    DiscoverFeature(
        id = "live_trivia", category = WATCHING_LIVE_TV,
        nameKey = "discover.feature.live_trivia.name",
        taglineKey = "discover.feature.live_trivia.tagline",
        descriptionKey = "discover.feature.live_trivia.description",
        iconName = "quiz", platforms = mobileOnly,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("lt1", "discover.walkthrough.live_trivia.1", "trivia_icon", WalkthroughAction.TAP, 0),
        ),
        deepLinkRoute = "live_tv",
    ),
    DiscoverFeature(
        id = "catch_up", category = WATCHING_LIVE_TV,
        nameKey = "discover.feature.catch_up.name",
        taglineKey = "discover.feature.catch_up.tagline",
        descriptionKey = "discover.feature.catch_up.description",
        iconName = "fast_forward", platforms = allPlatforms,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("cu1", "discover.walkthrough.catch_up.1", "catchup_button", WalkthroughAction.TAP, 0),
        ),
        deepLinkRoute = "epg",
    ),
)
