package tv.bayit.plus.feature.discover.model

import tv.bayit.plus.feature.discover.model.DiscoverCategory.CHAT_ASSISTANTS
import tv.bayit.plus.feature.discover.model.DiscoverCategory.LEARN_HEBREW
import tv.bayit.plus.feature.discover.model.DiscoverCategory.SEARCH_DISCOVERY
import tv.bayit.plus.feature.discover.model.DiscoverPlatform.ANDROID
import tv.bayit.plus.feature.discover.model.DiscoverPlatform.IOS
import tv.bayit.plus.feature.discover.model.DiscoverPlatform.TVOS
import tv.bayit.plus.feature.discover.model.PrerequisiteType.AVATAR
import tv.bayit.plus.feature.discover.model.PrerequisiteType.MICROPHONE

private val allPlatforms = setOf(IOS, TVOS, ANDROID)
private val mobileOnly = setOf(IOS, ANDROID)

internal val hebrewFeatures = listOf(
    DiscoverFeature(
        id = "scene_search", category = SEARCH_DISCOVERY,
        nameKey = "discover.feature.scene_search.name",
        taglineKey = "discover.feature.scene_search.tagline",
        descriptionKey = "discover.feature.scene_search.description",
        iconName = "image_search", platforms = mobileOnly,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("ss1", "discover.walkthrough.scene_search.1", "scene_search_input", WalkthroughAction.TYPE, 0),
        ),
    ),
    DiscoverFeature(
        id = "phonetic_mirror", category = LEARN_HEBREW,
        nameKey = "discover.feature.phonetic_mirror.name",
        taglineKey = "discover.feature.phonetic_mirror.tagline",
        descriptionKey = "discover.feature.phonetic_mirror.description",
        iconName = "mic", platforms = mobileOnly,
        prerequisites = listOf(
            FeaturePrerequisite("mic", MICROPHONE, "discover.prereq.microphone"),
        ),
        walkthroughSteps = listOf(
            WalkthroughStep("pm1", "discover.walkthrough.phonetic_mirror.1", "mic_button", WalkthroughAction.TAP, 0),
            WalkthroughStep("pm2", "discover.walkthrough.phonetic_mirror.2", "record_button", WalkthroughAction.TAP, 1),
        ),
    ),
    DiscoverFeature(
        id = "talk_back", category = LEARN_HEBREW,
        nameKey = "discover.feature.talk_back.name",
        taglineKey = "discover.feature.talk_back.tagline",
        descriptionKey = "discover.feature.talk_back.description",
        iconName = "forum", platforms = mobileOnly,
        prerequisites = listOf(
            FeaturePrerequisite("avatar", AVATAR, "discover.prereq.avatar", "zeh_ani"),
            FeaturePrerequisite("mic", MICROPHONE, "discover.prereq.microphone"),
        ),
        walkthroughSteps = listOf(
            WalkthroughStep("tb1", "discover.walkthrough.talk_back.1", "talkback_start", WalkthroughAction.TAP, 0),
        ),
    ),
    DiscoverFeature(
        id = "interactive_mission", category = LEARN_HEBREW,
        nameKey = "discover.feature.interactive_mission.name",
        taglineKey = "discover.feature.interactive_mission.tagline",
        descriptionKey = "discover.feature.interactive_mission.description",
        iconName = "flag", platforms = mobileOnly,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("im1", "discover.walkthrough.interactive_mission.1", "missions_tab", WalkthroughAction.TAP, 0),
        ),
    ),
    DiscoverFeature(
        id = "glossary", category = LEARN_HEBREW,
        nameKey = "discover.feature.glossary.name",
        taglineKey = "discover.feature.glossary.tagline",
        descriptionKey = "discover.feature.glossary.description",
        iconName = "menu_book", platforms = allPlatforms,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("g1", "discover.walkthrough.glossary.1", "glossary_icon", WalkthroughAction.TAP, 0),
        ),
    ),
)

internal val searchFeatures = listOf(
    DiscoverFeature(
        id = "llm_search", category = SEARCH_DISCOVERY,
        nameKey = "discover.feature.llm_search.name",
        taglineKey = "discover.feature.llm_search.tagline",
        descriptionKey = "discover.feature.llm_search.description",
        iconName = "manage_search", platforms = mobileOnly,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("lls1", "discover.walkthrough.llm_search.1", "llm_search_input", WalkthroughAction.TYPE, 0),
        ),
    ),
    DiscoverFeature(
        id = "proactive_voice", category = SEARCH_DISCOVERY,
        nameKey = "discover.feature.proactive_voice.name",
        taglineKey = "discover.feature.proactive_voice.tagline",
        descriptionKey = "discover.feature.proactive_voice.description",
        iconName = "assistant", platforms = mobileOnly,
        prerequisites = listOf(
            FeaturePrerequisite("mic", MICROPHONE, "discover.prereq.microphone"),
        ),
        walkthroughSteps = listOf(
            WalkthroughStep("pv1", "discover.walkthrough.proactive_voice.1", "voice_fab", WalkthroughAction.TAP, 0),
        ),
    ),
)

internal val chatFeatures = listOf(
    DiscoverFeature(
        id = "chatbot", category = CHAT_ASSISTANTS,
        nameKey = "discover.feature.chatbot.name",
        taglineKey = "discover.feature.chatbot.tagline",
        descriptionKey = "discover.feature.chatbot.description",
        iconName = "support_agent", platforms = allPlatforms,
        prerequisites = emptyList(),
        walkthroughSteps = listOf(
            WalkthroughStep("cb1", "discover.walkthrough.chatbot.1", "chatbot_fab", WalkthroughAction.TAP, 0),
            WalkthroughStep("cb2", "discover.walkthrough.chatbot.2", "chat_input", WalkthroughAction.TYPE, 1),
        ),
    ),
)
