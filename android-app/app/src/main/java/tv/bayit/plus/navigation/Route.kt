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
    @Serializable data class Player(val contentId: String, val contentType: String, val resumePositionMs: Long = 0L) : Route()
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
    @Serializable data object VoiceSearch : Route()
    @Serializable data object VoiceSettings : Route()
    @Serializable data object VoiceWizard : Route()
    @Serializable data class TalkBack(val contentId: String) : Route()
    @Serializable data object VoiceAvatar : Route()

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

    // Category browse (VOD filtered to a specific category)
    @Serializable data class CategoryBrowse(val categoryId: String) : Route()

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

    // TV Login (phone companion flow)
    @Serializable data class TVLogin(val sessionId: String, val token: String, val expires: String) : Route()

    // Help Center
    @Serializable data object HelpCenter : Route()

    // Extended Settings
    @Serializable data object SubtitleSettings : Route()
    @Serializable data object AudioSettings : Route()
    @Serializable data object AIFeatures : Route()
    @Serializable data object AccessibilitySettings : Route()
    @Serializable data object PlaybackSettings : Route()

    // Rewards
    @Serializable data object Rewards : Route()

    // Widgets
    @Serializable data object Widgets : Route()

    // BYOC (Bring Your Own Content)
    @Serializable data object BYOCSettings : Route()
    @Serializable data object PlexAuth : Route()
    @Serializable data object YouTubeAuth : Route()
    @Serializable data object AddSource : Route()

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
    @Serializable data class ZehAniMagicMirror(val profileId: String, val avatarId: String = "") : Route()
    @Serializable data class ZehAniV2V(val avatarId: String, val profileId: String) : Route()
    @Serializable data class ZehAniAvatar3D(val profileId: String) : Route()
    @Serializable data class ZehAniHighlights(val profileId: String) : Route()
    @Serializable data class ZehAniMovieInteractions(val profileId: String) : Route()
    @Serializable data class ZehAniContacts(val profileId: String) : Route()
    @Serializable data class ZehAniFeedback(val profileId: String) : Route()
    @Serializable data class ZehAniAvatarSettings(val profileId: String, val avatarId: String) : Route()
    @Serializable data class ZehAniConsent(val profileId: String) : Route()

    // TV-specific routes
    @Serializable data object TVHome : Route()
    @Serializable data object TVAuth : Route()
    @Serializable data object TVSearch : Route()

    // Auth
    @Serializable data object Splash : Route()
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
        get() = routeLabels[this::class.simpleName].orEmpty()
}
