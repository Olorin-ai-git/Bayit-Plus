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
    case player(contentId: String, contentType: ContentType)
    case movieDetail(movieId: String)
    case seriesDetail(seriesId: String)
    case collectionDetail(collectionId: String)
    case podcastDetail(showId: String)
    case epg

    // Search
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

    // Content categories
    case children
    case youngsters
    case judaism
    case flows
    case morningRitual

    // Voice
    case voiceOnboarding

    // Support
    case support

    // Trivia & Quiz
    case trivia(contentId: String)

    // LLM Search
    case llmSearch

    // Family Controls
    case familyControls

    // Shabbat Mode
    case shabbatMode

    // Culture Content
    case jerusalemContent
    case telAvivContent

    // Audiobooks
    case audiobooks
    case audiobookDetail(audiobookId: String)

    // Trending
    case trending

    // Interactive Subtitles
    case interactiveSubtitles(contentId: String)

    // Chapter Navigation
    case chapters(contentId: String)

    // AI Chat
    case chatbot

    // Avatar Mode
    case avatarMode

    // Beta Credits
    case betaCredits

    // Subscription Gate
    case subscriptionGate(contentId: String, requiredTier: String)

    // Household
    case household

    // Device Pairing
    case devicePairing

    // Help Center
    case helpCenter

    // Rewards
    case rewards

    // Widgets
    case widgets

    // Passkey Management
    case passkeyManagement

    // Onboarding AI
    case onboardingAI

    // Social
    case friends
    case watchParty
    case watchPartyDetail(partyId: String)

    // Chess
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
}

// MARK: - Breadcrumb Labels

extension Route {
    /// Human-readable label for breadcrumb display
    var breadcrumbLabel: String {
        switch self {
        case .home: return "Home"
        case .liveTV: return "Live TV"
        case .vod: return "VOD"
        case .radio: return "Radio"
        case .podcasts: return "Podcasts"
        case .player: return "Player"
        case .movieDetail: return "Movie"
        case .seriesDetail: return "Series"
        case .collectionDetail: return "Collection"
        case .podcastDetail: return "Podcast"
        case .epg: return "TV Guide"
        case .search: return "Search"
        case .profile: return "Profile"
        case .favorites: return "Favorites"
        case .playlist: return "Playlist"
        case .downloads: return "Downloads"
        case .recordings: return "Recordings"
        case .settings: return "Settings"
        case .languageSettings: return "Language"
        case .notificationSettings: return "Notifications"
        case .billing: return "Billing"
        case .subscription: return "Subscription"
        case .security: return "Security"
        case .connectedAccounts: return "Connected Accounts"
        case .children: return "Children"
        case .youngsters: return "Youngsters"
        case .judaism: return "Judaism"
        case .flows: return "Flows"
        case .morningRitual: return "Morning Ritual"
        case .voiceOnboarding: return "Voice Setup"
        case .support: return "Support"
        case .trivia: return "Trivia"
        case .llmSearch: return "AI Search"
        case .familyControls: return "Family Controls"
        case .shabbatMode: return "Shabbat"
        case .jerusalemContent: return "Jerusalem"
        case .telAvivContent: return "Tel Aviv"
        case .audiobooks: return "Audiobooks"
        case .audiobookDetail: return "Audiobook"
        case .trending: return "Trending"
        case .interactiveSubtitles: return "Subtitles"
        case .chapters: return "Chapters"
        case .chatbot: return "AI Chat"
        case .avatarMode: return "Avatar"
        case .betaCredits: return "Credits"
        case .subscriptionGate: return "Subscribe"
        case .household: return "Household"
        case .devicePairing: return "Devices"
        case .helpCenter: return "Help"
        case .rewards: return "Rewards"
        case .widgets: return "Widgets"
        case .passkeyManagement: return "Passkeys"
        case .onboardingAI: return "Setup"
        case .friends: return "Friends"
        case .watchParty: return "Watch Party"
        case .watchPartyDetail: return "Party"
        case .chess: return "Chess"
        case .directMessages: return "Messages"
        case .conversation: return "Conversation"
        case .mfaSetup: return "MFA Setup"
        case .phoneVerification: return "Phone Verification"
        case .zehAni: return "Me in the Story"
        case .zehAniMagicMirror: return "Magic Mirror"
        case .zehAniV2V: return "Voice Practice"
        case .zehAniAvatar3D: return "3D Avatar"
        case .zehAniHighlights: return "Highlights"
        case .zehAniContacts: return "Contacts"
        case .zehAniFeedback: return "Feedback"
        case .zehAniAvatarSettings: return "Avatar Settings"
        }
    }
}

