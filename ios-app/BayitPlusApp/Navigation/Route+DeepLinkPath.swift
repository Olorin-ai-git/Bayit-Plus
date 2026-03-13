import Foundation

// MARK: - Deep Link Path Serialization

extension Route {
    /// Converts a restorable route to a deep link path string suitable for
    /// round-tripping through `DeepLink.route(from:)`.
    ///
    /// Only routes with matching parsers in `DeepLinkRouter` are included to
    /// guarantee a valid restore. Auth, player, payment, settings sub-pages,
    /// and onboarding routes return `nil`.
    var toDeepLinkPath: String? {
        switch self {
        // Content detail (parsed by DeepLinkRouter+Parsing.swift)
        case let .movieDetail(movieId):
            return "movie/\(movieId)"

        case let .seriesDetail(seriesId):
            return "series/\(seriesId)"

        case let .audiobookDetail(audiobookId):
            return "audiobooks/\(audiobookId)"

        case let .watchPartyDetail(partyId):
            return "party/\(partyId)"

        case let .trivia(contentId):
            return "trivia/\(contentId)"

        // Tab-level destinations (parsed by DeepLinkRouter.parseSimpleRoute)
        case .liveTV: return "live"

        case .podcasts: return "podcasts"

        case .search: return "search"

        case .trending: return "trending"

        case .audiobooks: return "audiobooks"

        case .watchParty: return "party"

        // Routes that must not be restored (auth, player, payment, onboarding,
        // settings sub-pages, or routes with no matching deep link parser)
        default:
            return nil
        }
    }
}
