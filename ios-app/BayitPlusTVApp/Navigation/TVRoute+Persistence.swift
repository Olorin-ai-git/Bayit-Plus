import Foundation

// MARK: - Deep Link Persistence

extension TVRoute {
    /// Returns a stable path string for routes that are safe to persist across
    /// sessions. Returns `nil` for ephemeral routes (player, auth, subscription gate).
    func toDeepLinkPath() -> String? {
        switch self {
        case let .movieDetail(movieId):
            return "movie/\(movieId)"
        case let .seriesDetail(seriesId):
            return "series/\(seriesId)"
        case let .podcastDetail(showId):
            return "podcast/\(showId)"
        case let .audiobookDetail(audiobookId):
            return "audiobook/\(audiobookId)"
        case .player, .subscriptionGate, .connectedAccounts,
             .voiceAssistant, .actorDetail, .collectionDetail,
             .audiobooks, .audiobookBrowse, .podcastBrowse,
             .help, .missions, .missionsLeaderboard, .shekelsWallet,
             .couponShop, .cultureDetail, .aiCompanion, .catchUpSummary,
             .quiz, .watchlist, .downloads, .judaism, .byocDetail, .continueWatchingBrowse:
            return nil
        }
    }

    /// Reconstruct a `TVRoute` from a path string produced by `toDeepLinkPath()`.
    /// Returns `nil` if the path is unrecognised or malformed.
    static func restored(fromDeepLinkPath path: String) -> TVRoute? {
        let parts = path.split(separator: "/", maxSplits: 1).map(String.init)
        guard parts.count == 2, !parts[1].isEmpty else { return nil }
        let kind = parts[0]
        let id = parts[1]
        switch kind {
        case "movie": return .movieDetail(movieId: id)
        case "series": return .seriesDetail(seriesId: id)
        case "podcast": return .podcastDetail(showId: id)
        case "audiobook": return .audiobookDetail(audiobookId: id)
        default: return nil
        }
    }
}
