package tv.bayit.plus.navigation

import kotlinx.serialization.Serializable

@Serializable
sealed class Route {
    // Tab roots
    @Serializable data object Home : Route()
    @Serializable data object LiveTV : Route()
    @Serializable data object Vod : Route()
    @Serializable data object Radio : Route()
    @Serializable data object Podcasts : Route()

    // Content detail
    @Serializable data class Player(val contentId: String, val contentType: String) : Route()
    @Serializable data class MovieDetail(val movieId: String) : Route()
    @Serializable data class SeriesDetail(val seriesId: String) : Route()
    @Serializable data class CollectionDetail(val collectionId: String) : Route()
    @Serializable data class PodcastDetail(val showId: String) : Route()
    @Serializable data object Epg : Route()

    // Search
    @Serializable data object Search : Route()

    // User features
    @Serializable data object Profile : Route()
    @Serializable data object Favorites : Route()
    @Serializable data object Playlist : Route()
    @Serializable data object Downloads : Route()
    @Serializable data object Recordings : Route()

    // Settings
    @Serializable data object Settings : Route()
    @Serializable data object LanguageSettings : Route()
    @Serializable data object NotificationSettings : Route()
    @Serializable data object Billing : Route()
    @Serializable data object Subscription : Route()
    @Serializable data object Security : Route()
    @Serializable data object ConnectedAccounts : Route()

    // Content categories
    @Serializable data object Children : Route()
    @Serializable data object Youngsters : Route()
    @Serializable data object Judaism : Route()
    @Serializable data object Flows : Route()
    @Serializable data object MorningRitual : Route()

    // Voice
    @Serializable data object VoiceOnboarding : Route()

    // Support
    @Serializable data object Support : Route()

    // Trivia & Quiz
    @Serializable data class Trivia(val contentId: String) : Route()

    // LLM Search
    @Serializable data object LlmSearch : Route()

    // Family Controls
    @Serializable data object FamilyControls : Route()

    // Shabbat Mode
    @Serializable data object ShabbatMode : Route()

    // Culture Content
    @Serializable data object JerusalemContent : Route()
    @Serializable data object TelAvivContent : Route()

    // Audiobooks
    @Serializable data object Audiobooks : Route()
    @Serializable data class AudiobookDetail(val audiobookId: String) : Route()

    // Trending
    @Serializable data object Trending : Route()

    // Interactive Subtitles
    @Serializable data class InteractiveSubtitles(val contentId: String) : Route()

    // Chapter Navigation
    @Serializable data class Chapters(val contentId: String) : Route()

    // AI Chat
    @Serializable data object Chatbot : Route()

    // Avatar Mode
    @Serializable data object AvatarMode : Route()

    // Beta Credits
    @Serializable data object BetaCredits : Route()

    // Subscription Gate
    @Serializable data class SubscriptionGate(val contentId: String, val requiredTier: String) : Route()

    // Household
    @Serializable data object Household : Route()

    // Device Pairing
    @Serializable data object DevicePairing : Route()

    // Help Center
    @Serializable data object HelpCenter : Route()

    // Rewards
    @Serializable data object Rewards : Route()

    // Widgets
    @Serializable data object Widgets : Route()

    // Passkey Management
    @Serializable data object PasskeyManagement : Route()

    // Onboarding AI
    @Serializable data object OnboardingAI : Route()

    // Social
    @Serializable data object Friends : Route()
    @Serializable data object WatchParty : Route()
    @Serializable data class WatchPartyDetail(val partyId: String) : Route()

    // Chess
    @Serializable data class Chess(val gameId: String? = null) : Route()

    // Direct Messages
    @Serializable data object DirectMessages : Route()
    @Serializable data class Conversation(val friendId: String) : Route()

    // Security & Verification
    @Serializable data object MfaSetup : Route()
    @Serializable data object PhoneVerification : Route()

    // Zeh Ani (Me in the Story)
    @Serializable data object ZehAni : Route()
    @Serializable data class ZehAniMagicMirror(val profileId: String) : Route()
    @Serializable data class ZehAniV2V(val avatarId: String, val profileId: String) : Route()
    @Serializable data class ZehAniAvatar3D(val avatarId: String) : Route()
    @Serializable data class ZehAniHighlights(val profileId: String) : Route()
    @Serializable data class ZehAniContacts(val profileId: String) : Route()
    @Serializable data class ZehAniFeedback(val profileId: String) : Route()
    @Serializable data class ZehAniAvatarSettings(val profileId: String, val avatarId: String) : Route()

    // Auth
    @Serializable data object Login : Route()
    @Serializable data object Register : Route()
    @Serializable data object ForgotPassword : Route()
    @Serializable data object ProfileSelection : Route()
    @Serializable data object AddProfile : Route()
    @Serializable data class EditProfile(val profileId: String) : Route()

    // Payment
    @Serializable data object PaymentSuccess : Route()
    @Serializable data object PaymentCancelled : Route()
    @Serializable data object PaymentPending : Route()
    @Serializable data object Subscribe : Route()

    // Activity
    @Serializable data object ActivityFeed : Route()

    // Additional screens
    @Serializable data object Culture : Route()
    @Serializable data object Glossary : Route()
    @Serializable data class GlossaryDetail(val termId: String) : Route()
    @Serializable data object StarStory : Route()
    @Serializable data object V2VPractice : Route()
    @Serializable data object MissionsDashboard : Route()
    @Serializable data class InteractiveMission(val missionId: String) : Route()
    @Serializable data object AvatarWardrobe : Route()
    @Serializable data object MeshAvatar : Route()
    @Serializable data object VideoSelfie : Route()
    @Serializable data object NewsClip : Route()
    @Serializable data object WidgetGallery : Route()

    val breadcrumbLabel: String
        get() = when (this) {
            is Home -> "Home"
            is LiveTV -> "Live TV"
            is Vod -> "VOD"
            is Radio -> "Radio"
            is Podcasts -> "Podcasts"
            is Player -> "Player"
            is MovieDetail -> "Movie"
            is SeriesDetail -> "Series"
            is CollectionDetail -> "Collection"
            is PodcastDetail -> "Podcast"
            is Epg -> "TV Guide"
            is Search -> "Search"
            is Profile -> "Profile"
            is Favorites -> "Favorites"
            is Playlist -> "Playlist"
            is Downloads -> "Downloads"
            is Recordings -> "Recordings"
            is Settings -> "Settings"
            is LanguageSettings -> "Language"
            is NotificationSettings -> "Notifications"
            is Billing -> "Billing"
            is Subscription -> "Subscription"
            is Security -> "Security"
            is ConnectedAccounts -> "Connected Accounts"
            is Children -> "Children"
            is Youngsters -> "Youngsters"
            is Judaism -> "Judaism"
            is Flows -> "Flows"
            is MorningRitual -> "Morning Ritual"
            is VoiceOnboarding -> "Voice Setup"
            is Support -> "Support"
            is Trivia -> "Trivia"
            is LlmSearch -> "AI Search"
            is FamilyControls -> "Family Controls"
            is ShabbatMode -> "Shabbat"
            is JerusalemContent -> "Jerusalem"
            is TelAvivContent -> "Tel Aviv"
            is Audiobooks -> "Audiobooks"
            is AudiobookDetail -> "Audiobook"
            is Trending -> "Trending"
            is InteractiveSubtitles -> "Subtitles"
            is Chapters -> "Chapters"
            is Chatbot -> "AI Chat"
            is AvatarMode -> "Avatar"
            is BetaCredits -> "Credits"
            is SubscriptionGate -> "Subscribe"
            is Household -> "Household"
            is DevicePairing -> "Devices"
            is HelpCenter -> "Help"
            is Rewards -> "Rewards"
            is Widgets -> "Widgets"
            is PasskeyManagement -> "Passkeys"
            is OnboardingAI -> "Setup"
            is Friends -> "Friends"
            is WatchParty -> "Watch Party"
            is WatchPartyDetail -> "Party"
            is Chess -> "Chess"
            is DirectMessages -> "Messages"
            is Conversation -> "Conversation"
            is MfaSetup -> "MFA Setup"
            is PhoneVerification -> "Phone Verification"
            is ZehAni -> "Me in the Story"
            is ZehAniMagicMirror -> "Magic Mirror"
            is ZehAniV2V -> "Voice Practice"
            is ZehAniAvatar3D -> "3D Avatar"
            is ZehAniHighlights -> "Highlights"
            is ZehAniContacts -> "Contacts"
            is ZehAniFeedback -> "Feedback"
            is ZehAniAvatarSettings -> "Avatar Settings"
            is Login -> "Login"
            is Register -> "Register"
            is ForgotPassword -> "Forgot Password"
            is ProfileSelection -> "Profiles"
            is AddProfile -> "Add Profile"
            is EditProfile -> "Edit Profile"
            is PaymentSuccess -> "Payment Success"
            is PaymentCancelled -> "Payment Cancelled"
            is PaymentPending -> "Payment Pending"
            is Subscribe -> "Subscribe"
            is ActivityFeed -> "Activity"
            is Culture -> "Culture"
            is Glossary -> "Glossary"
            is GlossaryDetail -> "Term"
            is StarStory -> "Star Story"
            is V2VPractice -> "V2V Practice"
            is MissionsDashboard -> "Missions"
            is InteractiveMission -> "Mission"
            is AvatarWardrobe -> "Wardrobe"
            is MeshAvatar -> "3D Avatar"
            is VideoSelfie -> "Selfie"
            is NewsClip -> "News"
            is WidgetGallery -> "Widget Gallery"
        }
}
