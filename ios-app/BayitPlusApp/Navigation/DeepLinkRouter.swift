import Foundation

/// Deep link URL handler for bayitplus:// scheme and bayit.tv universal links.
/// Extracted from Route.swift to keep each file under 200 lines.
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

        case "friends":
            return .friends

        case "party":
            if let code = pathComponents.dropFirst().first {
                return .watchPartyDetail(partyId: code)
            }
            return .watchParty

        case "chess":
            let gameId = pathComponents.dropFirst().first
            return .chess(gameId: gameId)

        case "dm":
            if let friendId = pathComponents.dropFirst().first {
                return .conversation(friendId: friendId)
            }
            return .directMessages

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
