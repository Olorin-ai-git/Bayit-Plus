import BayitMedia
import Foundation

/// Navigation routes for the tvOS app.
/// Simpler than iOS routes since tvOS uses tab-level navigation with fullscreen modals.
enum TVRoute: Hashable, Identifiable {

    var id: Int { hashValue }
    /// Present the fullscreen player.
    case player(contentId: String, contentType: MediaContentType, channelId: String?)
    /// Navigate to podcast detail screen.
    case podcastDetail(showId: String)
    /// Navigate to series detail screen.
    case seriesDetail(seriesId: String)
    /// Navigate to movie detail screen.
    case movieDetail(movieId: String)
    /// Navigate to collection detail screen.
    case collectionDetail(collectionId: String)
    /// Navigate to audiobook detail screen.
    case audiobookDetail(audiobookId: String)
    /// Navigate to full audiobooks listing.
    case audiobooks
    /// Show voice assistant overlay.
    case voiceAssistant
    /// Show help center.
    case help
    /// Show daily missions.
    case missions
    /// Show missions leaderboard.
    case missionsLeaderboard
    /// Show shekels wallet.
    case shekelsWallet
    /// Show coupon shop.
    case couponShop
    /// Show culture detail for a specific item.
    case cultureDetail(id: String)
    /// Show subscription gate.
    case subscriptionGate
    /// Show connected accounts settings.
    case connectedAccounts
    /// Show AI companion for content.
    case aiCompanion(contentId: String)
    /// Show catch-up summary for content.
    case catchUpSummary(contentId: String)
    /// Show trivia quiz for content.
    case quiz(contentId: String)

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        switch self {
        case .player(let contentId, let contentType, let channelId):
            hasher.combine("player")
            hasher.combine(contentId)
            hasher.combine(contentType.rawValue)
            hasher.combine(channelId)
        case .podcastDetail(let showId):
            hasher.combine("podcastDetail")
            hasher.combine(showId)
        case .seriesDetail(let seriesId):
            hasher.combine("seriesDetail")
            hasher.combine(seriesId)
        case .movieDetail(let movieId):
            hasher.combine("movieDetail")
            hasher.combine(movieId)
        case .collectionDetail(let collectionId):
            hasher.combine("collectionDetail")
            hasher.combine(collectionId)
        case .audiobookDetail(let audiobookId):
            hasher.combine("audiobookDetail")
            hasher.combine(audiobookId)
        case .audiobooks:
            hasher.combine("audiobooks")
        case .voiceAssistant:
            hasher.combine("voiceAssistant")
        case .help:
            hasher.combine("help")
        case .missions:
            hasher.combine("missions")
        case .missionsLeaderboard:
            hasher.combine("missionsLeaderboard")
        case .shekelsWallet:
            hasher.combine("shekelsWallet")
        case .couponShop:
            hasher.combine("couponShop")
        case .cultureDetail(let id):
            hasher.combine("cultureDetail")
            hasher.combine(id)
        case .subscriptionGate:
            hasher.combine("subscriptionGate")
        case .connectedAccounts:
            hasher.combine("connectedAccounts")
        case .aiCompanion(let contentId):
            hasher.combine("aiCompanion")
            hasher.combine(contentId)
        case .catchUpSummary(let contentId):
            hasher.combine("catchUpSummary")
            hasher.combine(contentId)
        case .quiz(let contentId):
            hasher.combine("quiz")
            hasher.combine(contentId)
        }
    }

    static func == (lhs: TVRoute, rhs: TVRoute) -> Bool {
        switch (lhs, rhs) {
        case let (.player(lId, lType, lCh), .player(rId, rType, rCh)):
            return lId == rId && lType == rType && lCh == rCh
        case let (.podcastDetail(lId), .podcastDetail(rId)):
            return lId == rId
        case let (.seriesDetail(lId), .seriesDetail(rId)):
            return lId == rId
        case let (.movieDetail(lId), .movieDetail(rId)):
            return lId == rId
        case let (.collectionDetail(lId), .collectionDetail(rId)):
            return lId == rId
        case let (.audiobookDetail(lId), .audiobookDetail(rId)):
            return lId == rId
        case (.audiobooks, .audiobooks):
            return true
        case (.voiceAssistant, .voiceAssistant):
            return true
        case (.help, .help):
            return true
        case (.missions, .missions):
            return true
        case (.missionsLeaderboard, .missionsLeaderboard):
            return true
        case (.shekelsWallet, .shekelsWallet):
            return true
        case (.couponShop, .couponShop):
            return true
        case let (.cultureDetail(lId), .cultureDetail(rId)):
            return lId == rId
        case (.subscriptionGate, .subscriptionGate):
            return true
        case (.connectedAccounts, .connectedAccounts):
            return true
        case let (.aiCompanion(lId), .aiCompanion(rId)):
            return lId == rId
        case let (.catchUpSummary(lId), .catchUpSummary(rId)):
            return lId == rId
        case let (.quiz(lId), .quiz(rId)):
            return lId == rId
        default:
            return false
        }
    }
}
