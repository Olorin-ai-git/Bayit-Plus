package tv.bayit.plus.navigation

internal val routeLabels = mapOf(
    "Splash" to "Splash",
    "Home" to "Home",
    "LiveTV" to "Live TV",
    "Vod" to "VOD",
    "Radio" to "Radio",
    "Podcasts" to "Podcasts",
    "Player" to "Player",
    "MovieDetail" to "Movie",
    "SeriesDetail" to "Series",
    "CollectionDetail" to "Collection",
    "PodcastDetail" to "Podcast",
    "Epg" to "TV Guide",
    "Search" to "Search",
    "Profile" to "Profile",
    "Favorites" to "Favorites",
    "Playlist" to "Playlist",
    "Downloads" to "Downloads",
    "Recordings" to "Recordings",
    "Settings" to "Settings",
    "LanguageSettings" to "Language",
    "NotificationSettings" to "Notifications",
    "Billing" to "Billing",
    "Subscription" to "Subscription",
    "Security" to "Security",
    "ConnectedAccounts" to "Connected Accounts",
    "Children" to "Children",
    "Youngsters" to "Youngsters",
    "Judaism" to "Judaism",
    "Flows" to "Flows",
    "MorningRitual" to "Morning Ritual",
    "VoiceOnboarding" to "Voice Setup",
    "Support" to "Support",
    "Trivia" to "Trivia",
    "LlmSearch" to "AI Search",
    "FamilyControls" to "Family Controls",
    "ShabbatMode" to "Shabbat",
    "JerusalemContent" to "Jerusalem",
    "TelAvivContent" to "Tel Aviv",
    "Audiobooks" to "Audiobooks",
    "AudiobookDetail" to "Audiobook",
    "Trending" to "Trending",
    "InteractiveSubtitles" to "Subtitles",
    "Chapters" to "Chapters",
    "Chatbot" to "AI Chat",
    "AvatarMode" to "Avatar",
    "BetaCredits" to "Credits",
    "SubscriptionGate" to "Subscribe",
    "Household" to "Household",
    "DevicePairing" to "Devices",
    "HelpCenter" to "Help",
    "Rewards" to "Rewards",
    "Widgets" to "Widgets",
    "PasskeyManagement" to "Passkeys",
    "OnboardingAI" to "Setup",
    "Friends" to "Friends",
    "WatchParty" to "Watch Party",
    "WatchPartyDetail" to "Party",
    "Chess" to "Chess",
    "DirectMessages" to "Messages",
    "Conversation" to "Conversation",
    "MfaSetup" to "MFA Setup",
    "PhoneVerification" to "Phone Verification",
    "ZehAni" to "Me in the Story",
    "ZehAniMagicMirror" to "Magic Mirror",
    "ZehAniV2V" to "Voice Practice",
    "ZehAniAvatar3D" to "3D Avatar",
    "ZehAniHighlights" to "Highlights",
    "ZehAniContacts" to "Contacts",
    "ZehAniFeedback" to "Feedback",
    "ZehAniAvatarSettings" to "Avatar Settings",
    "ZehAniConsent" to "Biometric Consent",
    "Login" to "Login",
    "Register" to "Register",
    "ForgotPassword" to "Forgot Password",
    "ProfileSelection" to "Profiles",
    "AddProfile" to "Add Profile",
    "EditProfile" to "Edit Profile",
    "PaymentSuccess" to "Payment Success",
    "PaymentCancelled" to "Payment Cancelled",
    "PaymentPending" to "Payment Pending",
    "Subscribe" to "Subscribe",
    "ActivityFeed" to "Activity",
    "Culture" to "Culture",
    "Glossary" to "Glossary",
    "GlossaryDetail" to "Term",
    "StarStory" to "Star Story",
    "V2VPractice" to "V2V Practice",
    "MissionsDashboard" to "Missions",
    "InteractiveMission" to "Mission",
    "AvatarWardrobe" to "Wardrobe",
    "MeshAvatar" to "3D Avatar",
    "VideoSelfie" to "Selfie",
    "NewsClip" to "News",
    "WidgetGallery" to "Widget Gallery",
    "SubtitleSettings" to "Subtitles",
    "AudioSettings" to "Audio",
    "AIFeatures" to "AI Features",
    "AccessibilitySettings" to "Accessibility",
    "PlaybackSettings" to "Playback",
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
)

fun isAuthRoutePattern(routePattern: String): Boolean {
    return extractRouteName(routePattern) in authRouteNames
}

fun isTabRootPattern(routePattern: String): Boolean {
    return AppTab.entries.any { tab ->
        tab.route::class.qualifiedName == routePattern
    }
}
