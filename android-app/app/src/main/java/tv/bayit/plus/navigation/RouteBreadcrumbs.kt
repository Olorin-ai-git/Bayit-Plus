package tv.bayit.plus.navigation

internal val routeLabels = mapOf(
    "Splash" to "navigation.routes.splash",
    "Home" to "navigation.routes.home",
    "LiveTV" to "navigation.routes.liveTV",
    "Vod" to "navigation.routes.vod",
    "Radio" to "navigation.routes.radio",
    "Podcasts" to "navigation.routes.podcasts",
    "Player" to "navigation.routes.player",
    "MovieDetail" to "navigation.routes.movie",
    "SeriesDetail" to "navigation.routes.series",
    "CollectionDetail" to "navigation.routes.collection",
    "PodcastDetail" to "navigation.routes.podcast",
    "Epg" to "navigation.routes.tvGuide",
    "Search" to "navigation.routes.search",
    "Profile" to "navigation.routes.profile",
    "Favorites" to "navigation.routes.favorites",
    "Playlist" to "navigation.routes.playlist",
    "Downloads" to "navigation.routes.downloads",
    "Recordings" to "navigation.routes.recordings",
    "Settings" to "navigation.routes.settings",
    "LanguageSettings" to "navigation.routes.language",
    "NotificationSettings" to "navigation.routes.notifications",
    "Billing" to "navigation.routes.billing",
    "Subscription" to "navigation.routes.subscription",
    "Security" to "navigation.routes.security",
    "ConnectedAccounts" to "navigation.routes.connectedAccounts",
    "Children" to "navigation.routes.children",
    "Youngsters" to "navigation.routes.youngsters",
    "Judaism" to "navigation.routes.judaism",
    "Flows" to "navigation.routes.flows",
    "MorningRitual" to "navigation.routes.morningRitual",
    "VoiceOnboarding" to "navigation.routes.voiceSetup",
    "VoiceSearch" to "navigation.routes.voiceSearch",
    "VoiceSettings" to "navigation.routes.voiceSettings",
    "VoiceWizard" to "navigation.routes.voiceWizard",
    "TalkBack" to "navigation.routes.talkBack",
    "VoiceAvatar" to "navigation.routes.voiceAvatar",
    "Support" to "navigation.routes.support",
    "Trivia" to "navigation.routes.trivia",
    "LlmSearch" to "navigation.routes.aiSearch",
    "FamilyControls" to "navigation.routes.familyControls",
    "ShabbatMode" to "navigation.routes.shabbat",
    "JerusalemContent" to "navigation.routes.jerusalem",
    "TelAvivContent" to "navigation.routes.telAviv",
    "Audiobooks" to "navigation.routes.audiobooks",
    "AudiobookDetail" to "navigation.routes.audiobook",
    "Trending" to "navigation.routes.trending",
    "CategoryBrowse" to "navigation.routes.browse",
    "InteractiveSubtitles" to "navigation.routes.subtitles",
    "Chapters" to "navigation.routes.chapters",
    "Chatbot" to "navigation.routes.aiChat",
    "AvatarMode" to "navigation.routes.avatar",
    "BetaCredits" to "navigation.routes.credits",
    "SubscriptionGate" to "navigation.routes.subscribe",
    "Household" to "navigation.routes.household",
    "DevicePairing" to "navigation.routes.devices",
    "TVLogin" to "navigation.routes.tvSignIn",
    "HelpCenter" to "navigation.routes.help",
    "Rewards" to "navigation.routes.rewards",
    "Widgets" to "navigation.routes.widgets",
    "PasskeyManagement" to "navigation.routes.passkeys",
    "OnboardingAI" to "navigation.routes.setup",
    "Friends" to "navigation.routes.friends",
    "WatchParty" to "navigation.routes.watchParty",
    "WatchPartyDetail" to "navigation.routes.party",
    "Chess" to "navigation.routes.chess",
    "DirectMessages" to "navigation.routes.messages",
    "Conversation" to "navigation.routes.conversation",
    "MfaSetup" to "navigation.routes.mfaSetup",
    "PhoneVerification" to "navigation.routes.phoneVerification",
    "ZehAni" to "navigation.routes.meInTheStory",
    "ZehAniMagicMirror" to "navigation.routes.magicMirror",
    "ZehAniV2V" to "navigation.routes.voicePractice",
    "ZehAniAvatar3D" to "navigation.routes.avatar3D",
    "ZehAniHighlights" to "navigation.routes.highlights",
    "ZehAniContacts" to "navigation.routes.contacts",
    "ZehAniFeedback" to "navigation.routes.feedback",
    "ZehAniAvatarSettings" to "navigation.routes.avatarSettings",
    "ZehAniConsent" to "navigation.routes.biometricConsent",
    "Login" to "navigation.routes.login",
    "Register" to "navigation.routes.register",
    "ForgotPassword" to "navigation.routes.forgotPassword",
    "ProfileSelection" to "navigation.routes.profiles",
    "AddProfile" to "navigation.routes.addProfile",
    "EditProfile" to "navigation.routes.editProfile",
    "PaymentSuccess" to "navigation.routes.paymentSuccess",
    "PaymentCancelled" to "navigation.routes.paymentCancelled",
    "PaymentPending" to "navigation.routes.paymentPending",
    "Subscribe" to "navigation.routes.subscribe",
    "ActivityFeed" to "navigation.routes.activity",
    "Culture" to "navigation.routes.culture",
    "Glossary" to "navigation.routes.glossary",
    "GlossaryDetail" to "navigation.routes.term",
    "StarStory" to "navigation.routes.starStory",
    "V2VPractice" to "navigation.routes.v2vPractice",
    "MissionsDashboard" to "navigation.routes.missions",
    "InteractiveMission" to "navigation.routes.mission",
    "AvatarWardrobe" to "navigation.routes.wardrobe",
    "MeshAvatar" to "navigation.routes.avatar3D",
    "VideoSelfie" to "navigation.routes.selfie",
    "NewsClip" to "navigation.routes.news",
    "WidgetGallery" to "navigation.routes.widgetGallery",
    "SubtitleSettings" to "navigation.routes.subtitles",
    "AudioSettings" to "navigation.routes.audio",
    "AIFeatures" to "navigation.routes.aiFeatures",
    "AccessibilitySettings" to "navigation.routes.accessibility",
    "PlaybackSettings" to "navigation.routes.playback",
)

private fun extractRouteName(routePattern: String): String {
    return routePattern
        .substringAfterLast(".")
        .substringAfterLast("$")
        .substringBefore("/")
        .substringBefore("?")
}

fun routeLabelFromPattern(routePattern: String): String? {
    return routeLabels[extractRouteName(routePattern)]
}

private val authRouteNames = setOf(
    "Splash", "Login", "Register", "ForgotPassword",
    "ProfileSelection", "AddProfile", "EditProfile",
    "PaymentSuccess", "PaymentCancelled", "PaymentPending",
    "TVLogin",
)

fun isAuthRoutePattern(routePattern: String): Boolean {
    return extractRouteName(routePattern) in authRouteNames
}

fun isTabRootPattern(routePattern: String): Boolean {
    return AppTab.entries.any { tab ->
        tab.route::class.qualifiedName == routePattern
    }
}
