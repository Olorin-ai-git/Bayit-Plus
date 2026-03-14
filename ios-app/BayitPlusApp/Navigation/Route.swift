import BayitBYOC
import Foundation

/// All navigation destinations in the Bayit+ app
public enum Route: Hashable {
    // Tab roots
    case home
    case liveTV
    case vod
    case radio
    case podcasts

    // Content detail
    case player(contentId: String, contentType: ContentType, resume: Bool = false)
    case movieDetail(movieId: String)
    case seriesDetail(seriesId: String)
    case actorDetail(actorName: String)
    case collectionDetail(collectionId: String)
    case podcastDetail(showId: String)
    case epg

    /// Search
    case search

    // User features
    case profile
    case favorites
    case playlist
    case downloads
    case recordings

    // Settings
    case settings
    case languageSettings
    case notificationSettings
    case billing
    case subscription
    case security
    case connectedAccounts
    case byocSources
    case byocDetail(item: BYOCContentItem)
    case playbackSettings
    case audioSettings
    case accessibilitySettings
    case privacySettings
    case downloadSettings

    // Content categories
    case children
    case youngsters
    case judaism
    case flows
    case morningRitual

    /// Voice
    case voiceOnboarding

    /// Support
    case support

    /// Trivia & Quiz
    case trivia(contentId: String)

    /// LLM Search
    case llmSearch

    /// Hebrew Glossary
    case glossary

    /// Family Controls
    case familyControls

    /// Shabbat Mode
    case shabbatMode

    // Culture Content
    case jerusalemContent
    case telAvivContent

    // Audiobooks
    case audiobooks
    case audiobookCollections
    case audiobookAuthorDetail(author: String)
    case audiobookDetail(audiobookId: String)

    /// Trending
    case trending

    /// Interactive Subtitles
    case interactiveSubtitles(contentId: String)

    /// Chapter Navigation
    case chapters(contentId: String)

    /// AI Chat
    case chatbot

    /// Avatar Mode
    case avatarMode

    /// Beta Credits
    case betaCredits

    /// Subscription Gate
    case subscriptionGate(contentId: String, requiredTier: String)

    /// Household
    case household

    // Device Pairing
    case devicePairing
    case tvLogin(sessionId: String, token: String, expires: String)

    /// Help Center
    case helpCenter

    /// Rewards
    case rewards

    /// Widgets
    case widgets

    /// Onboarding AI
    case onboardingAI

    // Social
    case friends
    case watchParty
    case watchPartyDetail(partyId: String)

    /// Chess
    case chess(gameId: String?)

    // Direct Messages
    case directMessages
    case conversation(friendId: String)

    // Security & Verification
    case mfaSetup
    case phoneVerification

    // Zeh Ani (Me in the Story)
    case zehAni
    case zehAniMagicMirror(profileId: String)
    case zehAniV2V(avatarId: String, profileId: String)
    case zehAniAvatar3D(avatarId: String)
    case zehAniHighlights(profileId: String)
    case zehAniContacts(profileId: String)
    case zehAniFeedback(profileId: String)
    case zehAniAvatarSettings(profileId: String, avatarId: String)
    case zehAniMovieInteractions(profileId: String)
    case zehAniMovieCharacters(profileId: String, contentId: String)
    case zehAniCharacterDialogue(profileId: String, contentId: String, characterName: String)

    /// Interactive Mission
    case interactiveMission(missionId: String, profileId: String)
}
