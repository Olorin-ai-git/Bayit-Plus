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

    // Passkey Management
    case passkeyManagement

    // Onboarding AI
    case onboardingAI
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
        case .passkeyManagement: return "Passkeys"
        case .onboardingAI: return "Setup"
        }
    }
}

/// Content types for player navigation
public enum ContentType: String, Hashable, Codable, Sendable {
    case live
    case liveTV
    case movie
    case series
    case episode
    case radio
    case podcast
    case audiobook
}

/// Deep link URL handler
public enum DeepLink {
    /// Parse a URL into a Route
    /// Handles both bayitplus:// scheme and bayit.tv universal links
    static func route(from url: URL) -> Route? {
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        guard let first = pathComponents.first else {
            return .home
        }

        switch first {
        case "play":
            guard let contentId = pathComponents.dropFirst().first else { return nil }
            let typeString = url.queryValue(for: "type") ?? "movie"
            let contentType = ContentType(rawValue: typeString) ?? .movie
            return .player(contentId: contentId, contentType: contentType)

        case "movie":
            guard let movieId = pathComponents.dropFirst().first else { return nil }
            return .movieDetail(movieId: movieId)

        case "series":
            guard let seriesId = pathComponents.dropFirst().first else { return nil }
            return .seriesDetail(seriesId: seriesId)

        case "search":
            return .search

        case "live":
            return .liveTV

        case "radio":
            return .radio

        case "podcasts":
            return .podcasts

        case "profile":
            return .profile

        case "favorites":
            return .favorites

        case "settings":
            return .settings

        case "languageSettings":
            return .languageSettings

        case "notificationSettings":
            return .notificationSettings

        case "billing":
            return .billing

        case "subscription":
            return .subscription

        case "security":
            return .security

        case "support":
            return .support

        case "playlist":
            return .playlist

        case "downloads":
            return .downloads

        case "recordings":
            return .recordings

        case "children":
            return .children

        case "youngsters":
            return .youngsters

        case "judaism":
            return .judaism

        case "flows":
            return .flows

        case "morningRitual":
            return .morningRitual

        case "voiceOnboarding":
            return .voiceOnboarding

        case "trivia":
            guard let contentId = pathComponents.dropFirst().first else { return nil }
            return .trivia(contentId: contentId)

        case "llmSearch":
            return .llmSearch

        case "familyControls":
            return .familyControls

        case "shabbatMode":
            return .shabbatMode

        case "jerusalem":
            return .jerusalemContent

        case "telAviv":
            return .telAvivContent

        case "audiobooks":
            if let audiobookId = pathComponents.dropFirst().first {
                return .audiobookDetail(audiobookId: audiobookId)
            }
            return .audiobooks

        case "trending":
            return .trending

        case "chatbot":
            return .chatbot

        case "avatarMode":
            return .avatarMode

        case "betaCredits":
            return .betaCredits

        case "household":
            return .household

        case "devicePairing":
            return .devicePairing

        case "helpCenter":
            return .helpCenter

        case "rewards":
            return .rewards

        case "passkeyManagement":
            return .passkeyManagement

        case "onboardingAI":
            return .onboardingAI

        default:
            return .home
        }
    }
}

extension URL {
    func queryValue(for key: String) -> String? {
        URLComponents(url: self, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == key })?
            .value
    }
}
