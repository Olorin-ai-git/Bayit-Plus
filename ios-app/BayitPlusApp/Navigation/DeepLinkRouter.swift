import Foundation

/// Deep link URL handler for bayitplus:// scheme and bayit.tv universal links.
/// Extracted from Route.swift to keep each file under 200 lines.
public enum DeepLink {
    /// Parse a URL into a Route
    /// Handles both bayitplus:// scheme and bayit.tv universal links
    static func route(from url: URL) -> Route? {
        // Validate URL scheme - only accept bayitplus:// and bayit.tv
        guard url.scheme == "bayitplus" || url.host == "bayit.tv" else {
            return nil
        }

        let pathComponents = url.pathComponents.filter { $0 != "/" }

        guard let first = pathComponents.first else {
            return .home
        }

        switch first {
        case "play":
            guard let contentId = pathComponents.dropFirst().first,
                  let sanitized = sanitizeContentID(contentId) else { return nil }
            let typeString = url.queryValue(for: "type") ?? "movie"
            let contentType = ContentType(rawValue: typeString) ?? .movie
            return .player(contentId: sanitized, contentType: contentType)

        case "movie":
            guard let movieId = pathComponents.dropFirst().first,
                  let sanitized = sanitizeContentID(movieId) else { return nil }
            return .movieDetail(movieId: sanitized)

        case "series":
            guard let seriesId = pathComponents.dropFirst().first,
                  let sanitized = sanitizeContentID(seriesId) else { return nil }
            return .seriesDetail(seriesId: sanitized)

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
            guard let contentId = pathComponents.dropFirst().first,
                  let sanitized = sanitizeContentID(contentId) else { return nil }
            return .trivia(contentId: sanitized)

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
            if let audiobookId = pathComponents.dropFirst().first,
               let sanitized = sanitizeContentID(audiobookId) {
                return .audiobookDetail(audiobookId: sanitized)
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

        case "friends":
            return .friends

        case "party":
            if let code = pathComponents.dropFirst().first,
               let sanitized = sanitizeContentID(code) {
                return .watchPartyDetail(partyId: sanitized)
            }
            return .watchParty

        case "chess":
            let gameId = pathComponents.dropFirst().first
            return .chess(gameId: gameId)

        case "dm":
            if let friendId = pathComponents.dropFirst().first,
               let sanitized = sanitizeContentID(friendId) {
                return .conversation(friendId: sanitized)
            }
            return .directMessages

        case "tv-login":
            guard let sessionId = url.queryValue(for: "session"),
                  let token = url.queryValue(for: "token"),
                  let expires = url.queryValue(for: "expires") else {
                return nil
            }
            return .tvLogin(sessionId: sessionId, token: token, expires: expires)

        default:
            return .home
        }
    }

    /// Sanitize content ID to prevent path traversal and injection attacks.
    /// Only allows alphanumeric characters, hyphens, and underscores.
    private static func sanitizeContentID(_ id: String) -> String? {
        // Prevent path traversal
        guard !id.contains(".."), !id.contains("/"), !id.contains("\\") else {
            return nil
        }

        // Allow only safe characters: alphanumeric, hyphen, underscore
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
        guard id.unicodeScalars.allSatisfy({ allowed.contains($0) }) else {
            return nil
        }

        // Prevent excessively long IDs (reasonable MongoDB ObjectId is 24 chars)
        guard id.count <= 64 else {
            return nil
        }

        return id
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
