package tv.bayit.plus.feature.discover.model

/**
 * Static registry of all Discover features available on the Android platform.
 *
 * Feature definitions mirror the iOS `DiscoverFeatureCatalog` in BayitCore. The
 * [DiscoverPlatform.ANDROID] value in each [DiscoverFeature.platforms] set determines
 * whether [FeatureAvailabilityService] will surface the feature or report
 * [FeatureAvailabilityState.PlatformOnly].
 *
 * The catalog is an object rather than a class so that the ViewModel can access
 * it without injection — the data is compile-time constant and has no external
 * dependencies.
 */
object DiscoverFeatureCatalog {

    private val bothPlatforms: Set<DiscoverPlatform> = setOf(
        DiscoverPlatform.ANDROID,
        DiscoverPlatform.IOS,
    )

    private val iosOnly: Set<DiscoverPlatform> = setOf(DiscoverPlatform.IOS)

    /**
     * All features in catalog order (movies -> live TV -> Hebrew -> search -> chat).
     */
    val allFeatures: List<DiscoverFeature> by lazy {
        movieFeatures + liveTVFeatures + hebrewFeatures + searchFeatures + chatFeatures
    }

    /**
     * Categories sorted by [DiscoverCategory.sortOrder].
     */
    val categoriesOrdered: List<DiscoverCategory> =
        DiscoverCategory.entries.sortedBy { it.sortOrder }

    /**
     * Returns the subset of features belonging to [category].
     */
    fun features(category: DiscoverCategory): List<DiscoverFeature> =
        allFeatures.filter { it.category == category }

    /**
     * Returns the feature with the given [id], or null if not found.
     */
    fun featureById(id: String): DiscoverFeature? =
        allFeatures.firstOrNull { it.id == id }

    // -------------------------------------------------------------------------
    // While Watching Movies
    // -------------------------------------------------------------------------

    private val movieFeatures: List<DiscoverFeature> = listOf(
        DiscoverFeature(
            id = "pause_ask",
            category = DiscoverCategory.WATCHING_MOVIES,
            nameKey = "discover.feature.pause_ask.name",
            taglineKey = "discover.feature.pause_ask.tagline",
            descriptionKey = "discover.feature.pause_ask.description",
            iconName = "person_bubble",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "pause_ask_avatar",
                    type = FeaturePrerequisite.PrerequisiteType.AVATAR,
                    labelKey = "discover.prereq.avatar",
                    fixRoute = "bayitplus://settings/avatar",
                ),
                FeaturePrerequisite(
                    id = "pause_ask_preference",
                    type = FeaturePrerequisite.PrerequisiteType.PREFERENCE,
                    labelKey = "discover.prereq.preference",
                    fixRoute = "bayitplus://settings/playback",
                ),
                FeaturePrerequisite(
                    id = "pause_ask_contentType",
                    type = FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE,
                    labelKey = "discover.prereq.contentType",
                ),
            ),
            walkthroughSteps = makeSteps("pause_ask", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.PAUSE,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "player",
        ),
        DiscoverFeature(
            id = "interactive_subtitles",
            category = DiscoverCategory.WATCHING_MOVIES,
            nameKey = "discover.feature.interactive_subtitles.name",
            taglineKey = "discover.feature.interactive_subtitles.tagline",
            descriptionKey = "discover.feature.interactive_subtitles.description",
            iconName = "captions_bubble",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "interactive_subtitles_preference",
                    type = FeaturePrerequisite.PrerequisiteType.PREFERENCE,
                    labelKey = "discover.prereq.preference",
                    fixRoute = "bayitplus://settings/subtitles",
                ),
            ),
            walkthroughSteps = makeSteps("interactive_subtitles", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.SELECT,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "player",
        ),
        DiscoverFeature(
            id = "vocabulary",
            category = DiscoverCategory.WATCHING_MOVIES,
            nameKey = "discover.feature.vocabulary.name",
            taglineKey = "discover.feature.vocabulary.tagline",
            descriptionKey = "discover.feature.vocabulary.description",
            iconName = "textformat_abc",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "vocabulary_preference",
                    type = FeaturePrerequisite.PrerequisiteType.PREFERENCE,
                    labelKey = "discover.prereq.preference",
                    fixRoute = "bayitplus://settings/subtitles",
                ),
            ),
            walkthroughSteps = makeSteps("vocabulary", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.SELECT,
                WalkthroughAction.OBSERVE,
            )),
        ),
        DiscoverFeature(
            id = "vod_moments",
            category = DiscoverCategory.WATCHING_MOVIES,
            nameKey = "discover.feature.vod_moments.name",
            taglineKey = "discover.feature.vod_moments.tagline",
            descriptionKey = "discover.feature.vod_moments.description",
            iconName = "sparkles_rectangle_stack",
            platforms = iosOnly,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "vod_moments_avatar",
                    type = FeaturePrerequisite.PrerequisiteType.AVATAR,
                    labelKey = "discover.prereq.avatar",
                    fixRoute = "bayitplus://settings/avatar",
                ),
                FeaturePrerequisite(
                    id = "vod_moments_contentType",
                    type = FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE,
                    labelKey = "discover.prereq.contentType",
                ),
            ),
            walkthroughSteps = makeSteps("vod_moments", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "player",
        ),
        DiscoverFeature(
            id = "cultural_context",
            category = DiscoverCategory.WATCHING_MOVIES,
            nameKey = "discover.feature.cultural_context.name",
            taglineKey = "discover.feature.cultural_context.tagline",
            descriptionKey = "discover.feature.cultural_context.description",
            iconName = "globe_americas",
            platforms = iosOnly,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "cultural_context_contentType",
                    type = FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE,
                    labelKey = "discover.prereq.contentType",
                ),
            ),
            walkthroughSteps = makeSteps("cultural_context", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
            )),
        ),
        DiscoverFeature(
            id = "bilingual_bridge",
            category = DiscoverCategory.WATCHING_MOVIES,
            nameKey = "discover.feature.bilingual_bridge.name",
            taglineKey = "discover.feature.bilingual_bridge.tagline",
            descriptionKey = "discover.feature.bilingual_bridge.description",
            iconName = "character_book_closed_fill",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "bilingual_bridge_contentType",
                    type = FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE,
                    labelKey = "discover.prereq.contentType",
                ),
            ),
            walkthroughSteps = makeSteps("bilingual_bridge", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.SELECT,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "player",
        ),
        DiscoverFeature(
            id = "ai_companion",
            category = DiscoverCategory.WATCHING_MOVIES,
            nameKey = "discover.feature.ai_companion.name",
            taglineKey = "discover.feature.ai_companion.tagline",
            descriptionKey = "discover.feature.ai_companion.description",
            iconName = "brain_head_profile",
            platforms = iosOnly,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "ai_companion_contentType",
                    type = FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE,
                    labelKey = "discover.prereq.contentType",
                ),
            ),
            walkthroughSteps = makeSteps("ai_companion", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.TYPE,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "player",
        ),
    )

    // -------------------------------------------------------------------------
    // While Watching Live TV
    // -------------------------------------------------------------------------

    private val liveTVFeatures: List<DiscoverFeature> = listOf(
        DiscoverFeature(
            id = "live_dubbing",
            category = DiscoverCategory.WATCHING_LIVE_TV,
            nameKey = "discover.feature.live_dubbing.name",
            taglineKey = "discover.feature.live_dubbing.tagline",
            descriptionKey = "discover.feature.live_dubbing.description",
            iconName = "waveform_and_mic",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "live_dubbing_subscription",
                    type = FeaturePrerequisite.PrerequisiteType.SUBSCRIPTION,
                    labelKey = "discover.prereq.subscription",
                    fixRoute = "bayitplus://subscribe",
                ),
            ),
            walkthroughSteps = makeSteps("live_dubbing", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.SELECT,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "live_tv",
        ),
        DiscoverFeature(
            id = "live_subtitles",
            category = DiscoverCategory.WATCHING_LIVE_TV,
            nameKey = "discover.feature.live_subtitles.name",
            taglineKey = "discover.feature.live_subtitles.tagline",
            descriptionKey = "discover.feature.live_subtitles.description",
            iconName = "text_bubble",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "live_subtitles_subscription",
                    type = FeaturePrerequisite.PrerequisiteType.SUBSCRIPTION,
                    labelKey = "discover.prereq.subscription",
                    fixRoute = "bayitplus://subscribe",
                ),
            ),
            walkthroughSteps = makeSteps("live_subtitles", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.SELECT,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "live_tv",
        ),
        DiscoverFeature(
            id = "live_trivia",
            category = DiscoverCategory.WATCHING_LIVE_TV,
            nameKey = "discover.feature.live_trivia.name",
            taglineKey = "discover.feature.live_trivia.tagline",
            descriptionKey = "discover.feature.live_trivia.description",
            iconName = "questionmark_circle",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "live_trivia_contentType",
                    type = FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE,
                    labelKey = "discover.prereq.contentType",
                ),
            ),
            walkthroughSteps = makeSteps("live_trivia", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "live_tv",
        ),
        DiscoverFeature(
            id = "catch_up",
            category = DiscoverCategory.WATCHING_LIVE_TV,
            nameKey = "discover.feature.catch_up.name",
            taglineKey = "discover.feature.catch_up.tagline",
            descriptionKey = "discover.feature.catch_up.description",
            iconName = "clock_arrow_circlepath",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "catch_up_subscription",
                    type = FeaturePrerequisite.PrerequisiteType.SUBSCRIPTION,
                    labelKey = "discover.prereq.subscription",
                    fixRoute = "bayitplus://subscribe",
                ),
                FeaturePrerequisite(
                    id = "catch_up_contentType",
                    type = FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE,
                    labelKey = "discover.prereq.contentType",
                ),
            ),
            walkthroughSteps = makeSteps("catch_up", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.SELECT,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "live_tv",
        ),
        DiscoverFeature(
            id = "scene_search",
            category = DiscoverCategory.WATCHING_LIVE_TV,
            nameKey = "discover.feature.scene_search.name",
            taglineKey = "discover.feature.scene_search.tagline",
            descriptionKey = "discover.feature.scene_search.description",
            iconName = "magnifyingglass_circle",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "scene_search_contentType",
                    type = FeaturePrerequisite.PrerequisiteType.CONTENT_TYPE,
                    labelKey = "discover.prereq.contentType",
                ),
            ),
            walkthroughSteps = makeSteps("scene_search", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TYPE,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "live_tv",
        ),
    )

    // -------------------------------------------------------------------------
    // Learn Hebrew
    // -------------------------------------------------------------------------

    private val hebrewFeatures: List<DiscoverFeature> = listOf(
        DiscoverFeature(
            id = "phonetic_mirror",
            category = DiscoverCategory.LEARN_HEBREW,
            nameKey = "discover.feature.phonetic_mirror.name",
            taglineKey = "discover.feature.phonetic_mirror.tagline",
            descriptionKey = "discover.feature.phonetic_mirror.description",
            iconName = "mic_and_signal_meter",
            platforms = iosOnly,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "phonetic_mirror_microphone",
                    type = FeaturePrerequisite.PrerequisiteType.MICROPHONE,
                    labelKey = "discover.prereq.microphone",
                ),
                FeaturePrerequisite(
                    id = "phonetic_mirror_avatar",
                    type = FeaturePrerequisite.PrerequisiteType.AVATAR,
                    labelKey = "discover.prereq.avatar",
                    fixRoute = "bayitplus://settings/avatar",
                ),
            ),
            walkthroughSteps = makeSteps("phonetic_mirror", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
                WalkthroughAction.TAP,
            )),
            deepLinkRoute = "zeh_ani",
        ),
        DiscoverFeature(
            id = "talk_back",
            category = DiscoverCategory.LEARN_HEBREW,
            nameKey = "discover.feature.talk_back.name",
            taglineKey = "discover.feature.talk_back.tagline",
            descriptionKey = "discover.feature.talk_back.description",
            iconName = "bubble_left_and_text_bubble_right",
            platforms = iosOnly,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "talk_back_microphone",
                    type = FeaturePrerequisite.PrerequisiteType.MICROPHONE,
                    labelKey = "discover.prereq.microphone",
                ),
                FeaturePrerequisite(
                    id = "talk_back_avatar",
                    type = FeaturePrerequisite.PrerequisiteType.AVATAR,
                    labelKey = "discover.prereq.avatar",
                    fixRoute = "bayitplus://settings/avatar",
                ),
            ),
            walkthroughSteps = makeSteps("talk_back", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
                WalkthroughAction.TAP,
            )),
            deepLinkRoute = "zeh_ani",
        ),
        DiscoverFeature(
            id = "interactive_mission",
            category = DiscoverCategory.LEARN_HEBREW,
            nameKey = "discover.feature.interactive_mission.name",
            taglineKey = "discover.feature.interactive_mission.tagline",
            descriptionKey = "discover.feature.interactive_mission.description",
            iconName = "gamecontroller",
            platforms = iosOnly,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "interactive_mission_microphone",
                    type = FeaturePrerequisite.PrerequisiteType.MICROPHONE,
                    labelKey = "discover.prereq.microphone",
                ),
                FeaturePrerequisite(
                    id = "interactive_mission_avatar",
                    type = FeaturePrerequisite.PrerequisiteType.AVATAR,
                    labelKey = "discover.prereq.avatar",
                    fixRoute = "bayitplus://settings/avatar",
                ),
                FeaturePrerequisite(
                    id = "interactive_mission_preference",
                    type = FeaturePrerequisite.PrerequisiteType.PREFERENCE,
                    labelKey = "discover.prereq.preference",
                    fixRoute = "bayitplus://settings/consent",
                ),
            ),
            walkthroughSteps = makeSteps("interactive_mission", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.SELECT,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "missions",
        ),
        DiscoverFeature(
            id = "glossary",
            category = DiscoverCategory.LEARN_HEBREW,
            nameKey = "discover.feature.glossary.name",
            taglineKey = "discover.feature.glossary.tagline",
            descriptionKey = "discover.feature.glossary.description",
            iconName = "character_book_closed",
            platforms = bothPlatforms,
            prerequisites = emptyList(),
            walkthroughSteps = makeSteps("glossary", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TYPE,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "glossary",
        ),
    )

    // -------------------------------------------------------------------------
    // Search & Discovery
    // -------------------------------------------------------------------------

    private val searchFeatures: List<DiscoverFeature> = listOf(
        DiscoverFeature(
            id = "llm_search",
            category = DiscoverCategory.SEARCH_DISCOVERY,
            nameKey = "discover.feature.llm_search.name",
            taglineKey = "discover.feature.llm_search.tagline",
            descriptionKey = "discover.feature.llm_search.description",
            iconName = "sparkle_magnifyingglass",
            platforms = bothPlatforms,
            prerequisites = emptyList(),
            walkthroughSteps = makeSteps("llm_search", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TYPE,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "search",
        ),
        DiscoverFeature(
            id = "proactive_voice",
            category = DiscoverCategory.SEARCH_DISCOVERY,
            nameKey = "discover.feature.proactive_voice.name",
            taglineKey = "discover.feature.proactive_voice.tagline",
            descriptionKey = "discover.feature.proactive_voice.description",
            iconName = "waveform",
            platforms = bothPlatforms,
            prerequisites = listOf(
                FeaturePrerequisite(
                    id = "proactive_voice_preference",
                    type = FeaturePrerequisite.PrerequisiteType.PREFERENCE,
                    labelKey = "discover.prereq.preference",
                    fixRoute = "bayitplus://settings/voice",
                ),
            ),
            walkthroughSteps = makeSteps("proactive_voice", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TAP,
                WalkthroughAction.OBSERVE,
            )),
        ),
    )

    // -------------------------------------------------------------------------
    // Chat Assistants
    // -------------------------------------------------------------------------

    private val chatFeatures: List<DiscoverFeature> = listOf(
        DiscoverFeature(
            id = "chatbot",
            category = DiscoverCategory.CHAT_ASSISTANTS,
            nameKey = "discover.feature.chatbot.name",
            taglineKey = "discover.feature.chatbot.tagline",
            descriptionKey = "discover.feature.chatbot.description",
            iconName = "bubble_left_and_bubble_right_fill",
            platforms = bothPlatforms,
            prerequisites = emptyList(),
            walkthroughSteps = makeSteps("chatbot", listOf(
                WalkthroughAction.NAVIGATE,
                WalkthroughAction.TYPE,
                WalkthroughAction.OBSERVE,
            )),
            deepLinkRoute = "chatbot",
        ),
    )

    // -------------------------------------------------------------------------
    // Step builder
    // -------------------------------------------------------------------------

    private fun makeSteps(
        featureId: String,
        actions: List<WalkthroughAction>,
    ): List<WalkthroughStep> = actions.mapIndexed { index, action ->
        val stepNumber = index + 1
        WalkthroughStep(
            id = "${featureId}_step$stepNumber",
            instructionKey = "discover.walkthrough.$featureId.step$stepNumber",
            targetAccessibilityId = "discover_${featureId}_step$stepNumber",
            expectedAction = action,
            order = stepNumber,
            prerequisiteType = if (action == WalkthroughAction.CREATE_AVATAR) "avatar" else null,
        )
    }
}
