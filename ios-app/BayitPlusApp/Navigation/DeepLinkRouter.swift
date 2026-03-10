import BayitCore
import Foundation

/// Deep link URL handler for bayitplus:// scheme and bayit.tv universal links.
/// Content-specific route parsing is in DeepLinkRouter+Parsing.swift.
public enum DeepLink {
    /// Parse a URL into a Route.
    /// Handles both bayitplus:// scheme and bayit.tv universal links.
    static func route(from url: URL) -> Route? {
        guard url.scheme == "bayitplus" || url.host == "bayit.tv" else {
            return nil
        }

        let pathComponents = url.pathComponents.filter { $0 != "/" }

        // For custom URL schemes (bayitplus://X), iOS puts X in url.host not pathComponents.
        // For universal links (https://bayit.tv/X), X is in pathComponents.
        let first: String
        if let firstPath = pathComponents.first {
            first = firstPath
        } else if url.scheme == "bayitplus", let host = url.host, !host.isEmpty {
            first = host
        } else {
            return .home
        }

        // Collect remaining path components after the first
        let rest = url.scheme == "bayitplus"
            ? pathComponents
            : Array(pathComponents.dropFirst())

        // Try compound routes (settings/avatar, settings/subtitles, etc.)
        if let compoundRoute = parseCompoundRoute(first: first, rest: rest) {
            return compoundRoute
        }

        // Try simple navigation routes
        if let simpleRoute = parseSimpleRoute(first) {
            return simpleRoute
        }

        // Try content-specific routes (media, trivia, party, chess, DMs, tv-login)
        if let contentRoute = parseContentRoute(
            first: first,
            pathComponents: pathComponents,
            url: url
        ) {
            return contentRoute
        }

        return .home
    }

    // MARK: - Compound Routes

    private static func parseCompoundRoute(first: String, rest: [String]) -> Route? {
        guard let second = rest.first else { return nil }
        switch first {
        case "settings":
            return parseSettingsSubRoute(second)
        case "zeh-ani":
            return .avatarMode
        default:
            return nil
        }
    }

    private static func parseSettingsSubRoute(_ sub: String) -> Route? {
        switch sub {
        case "avatar": return .avatarMode
        case "subtitles", "playback": return .playbackSettings
        case "voice": return .audioSettings
        case "consent": return .privacySettings
        case "language": return .languageSettings
        case "notifications": return .notificationSettings
        default: return .settings
        }
    }

    // MARK: - Simple Routes

    private static func parseSimpleRoute(_ first: String) -> Route? {
        switch first {
        case "search": return .search
        case "live": return .liveTV
        case "radio": return .radio
        case "podcasts": return .podcasts
        case "profile": return .profile
        case "favorites": return .favorites
        case "settings": return .settings
        case "languageSettings": return .languageSettings
        case "notificationSettings": return .notificationSettings
        case "billing": return .billing
        case "subscription", "subscribe": return .subscription
        case "security": return .security
        case "playbackSettings": return .playbackSettings
        case "audioSettings": return .audioSettings
        case "accessibilitySettings": return .accessibilitySettings
        case "privacySettings": return .privacySettings
        case "support": return .support
        case "playlist": return .playlist
        case "downloads": return .downloads
        case "recordings": return .recordings
        case "children": return .children
        case "youngsters": return .youngsters
        case "judaism": return .judaism
        case "flows": return .flows
        case "morningRitual": return .morningRitual
        case "voiceOnboarding": return .voiceOnboarding
        case "llmSearch": return .llmSearch
        case "familyControls": return .familyControls
        case "shabbatMode": return .shabbatMode
        case "jerusalem": return .jerusalemContent
        case "telAviv": return .telAvivContent
        case "trending": return .trending
        case "chatbot": return .chatbot
        case "avatarMode": return .avatarMode
        case "betaCredits": return .betaCredits
        case "household": return .household
        case "devicePairing": return .devicePairing
        case "helpCenter": return .helpCenter
        case "rewards": return .rewards
        case "onboardingAI": return .onboardingAI
        case "friends": return .friends
        case "zeh-ani": return .avatarMode
        case "missions": return .flows
        case "glossary": return .glossary
        default: return nil
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
