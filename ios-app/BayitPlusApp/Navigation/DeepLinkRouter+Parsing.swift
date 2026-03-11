import BayitCore
import Foundation

/// Route parsing logic for deep links, split from DeepLink to keep
/// each file under the 200-line limit.
extension DeepLink {
    /// Parse the first path component into content-specific routes
    /// (media, audiobooks, trivia, party, chess, DMs, tv-login).
    static func parseContentRoute(
        first: String,
        pathComponents: [String],
        url: URL
    ) -> Route? {
        switch first {
        case "play":
            return parsePlayRoute(pathComponents: pathComponents, url: url)

        case "movie":
            guard let movieId = pathComponents.dropFirst().first,
                  let sanitized = sanitizeID(movieId) else { return nil }
            return .movieDetail(movieId: sanitized)

        case "series":
            guard let seriesId = pathComponents.dropFirst().first,
                  let sanitized = sanitizeID(seriesId) else { return nil }
            return .seriesDetail(seriesId: sanitized)

        case "trivia":
            guard let contentId = pathComponents.dropFirst().first,
                  let sanitized = sanitizeID(contentId) else { return nil }
            return .trivia(contentId: sanitized)

        case "audiobooks":
            if let audiobookId = pathComponents.dropFirst().first,
               let sanitized = sanitizeID(audiobookId)
            {
                return .audiobookDetail(audiobookId: sanitized)
            }
            return .audiobooks

        case "party":
            if let code = pathComponents.dropFirst().first,
               let sanitized = sanitizeID(code)
            {
                return .watchPartyDetail(partyId: sanitized)
            }
            return .watchParty

        case "chess":
            let gameId = pathComponents.dropFirst().first
            return .chess(gameId: gameId)

        case "dm":
            if let friendId = pathComponents.dropFirst().first,
               let sanitized = sanitizeID(friendId)
            {
                return .conversation(friendId: sanitized)
            }
            return .directMessages

        case "tv-login":
            return parseTVLoginRoute(url: url)

        default:
            return nil
        }
    }

    // MARK: - Play Route

    private static func parsePlayRoute(
        pathComponents: [String],
        url: URL
    ) -> Route? {
        let contentId = pathComponents.dropFirst().first
            .flatMap { sanitizeID($0) }

        if let walkthrough = url.queryValue(for: "walkthrough") {
            return parseWalkthroughRoute(
                walkthrough: walkthrough,
                contentId: contentId
            )
        }

        guard let sanitized = contentId else { return nil }
        let typeString = url.queryValue(for: "type") ?? "movie"
        let contentType = ContentType(rawValue: typeString) ?? .movie
        let resume = url.queryValue(for: "resume") == "true"
        return .player(contentId: sanitized, contentType: contentType, resume: resume)
    }

    private static func parseWalkthroughRoute(
        walkthrough: String,
        contentId: String?
    ) -> Route? {
        switch walkthrough {
        case "interactive_subtitles":
            return .interactiveSubtitles(contentId: contentId ?? "")
        case "chapters":
            return .chapters(contentId: contentId ?? "")
        default:
            guard let id = contentId else { return nil }
            return .player(contentId: id, contentType: .movie, resume: false)
        }
    }

    // MARK: - TV Login Route

    private static func parseTVLoginRoute(url: URL) -> Route? {
        let logger = BayitLogger(category: "DeepLink")
        guard let sessionId = url.queryValue(for: "session") else {
            logger.error("TV Login: Missing session parameter")
            return nil
        }
        guard let token = url.queryValue(for: "token") else {
            logger.error("TV Login: Missing token parameter")
            return nil
        }
        guard let expires = url.queryValue(for: "expires") else {
            logger.error("TV Login: Missing expires parameter")
            return nil
        }
        logger.info("TV Login deep link parsed")
        return .tvLogin(sessionId: sessionId, token: token, expires: expires)
    }

    // MARK: - ID Sanitization (package-internal access)

    static func sanitizeID(_ id: String) -> String? {
        guard !id.contains(".."), !id.contains("/"), !id.contains("\\") else {
            return nil
        }
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
        guard id.unicodeScalars.allSatisfy({ allowed.contains($0) }) else {
            return nil
        }
        guard id.count <= 64 else {
            return nil
        }
        return id
    }
}
