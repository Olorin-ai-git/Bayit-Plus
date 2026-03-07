import BayitBYOC
import BayitMedia
import Foundation

/// Navigation routes for the tvOS app.
/// Simpler than iOS routes since tvOS uses tab-level navigation with fullscreen modals.
enum TVRoute: Hashable, Identifiable {
    var id: Int {
        hashValue
    }

    /// Present the fullscreen player.
    case player(contentId: String, contentType: MediaContentType, channelId: String?, directUrl: String? = nil)
    /// Navigate to podcast detail screen.
    case podcastDetail(showId: String)
    /// Navigate to series detail screen.
    case seriesDetail(seriesId: String)
    /// Navigate to movie detail screen.
    case movieDetail(movieId: String)
    /// Navigate to actor detail screen.
    case actorDetail(actorName: String)
    /// Navigate to collection detail screen.
    case collectionDetail(collectionId: String)
    /// Navigate to audiobook detail screen.
    case audiobookDetail(audiobookId: String)
    /// Navigate to full audiobooks listing.
    case audiobooks
    /// Navigate to audiobook browse/discovery grid.
    case audiobookBrowse
    /// Navigate to podcast browse/discovery grid.
    case podcastBrowse
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
    /// Show user's watchlist / playlist.
    case watchlist
    /// Show downloaded content for offline viewing.
    case downloads
    /// Navigate to Judaism content with an optional category filter.
    case judaism(category: String)
    /// Navigate to BYOC item detail screen (Plex/IPTV movie detail).
    case byocDetail(item: BYOCContentItem)

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        switch self {
        case let .player(contentId, contentType, channelId, directUrl):
            hasher.combine("player")
            hasher.combine(contentId)
            hasher.combine(contentType.rawValue)
            hasher.combine(channelId)
            hasher.combine(directUrl)
        case let .podcastDetail(showId):
            hasher.combine("podcastDetail")
            hasher.combine(showId)
        case let .seriesDetail(seriesId):
            hasher.combine("seriesDetail")
            hasher.combine(seriesId)
        case let .movieDetail(movieId):
            hasher.combine("movieDetail")
            hasher.combine(movieId)
        case let .actorDetail(actorName):
            hasher.combine("actorDetail")
            hasher.combine(actorName)
        case let .collectionDetail(collectionId):
            hasher.combine("collectionDetail")
            hasher.combine(collectionId)
        case let .audiobookDetail(audiobookId):
            hasher.combine("audiobookDetail")
            hasher.combine(audiobookId)
        case .audiobooks:
            hasher.combine("audiobooks")
        case .audiobookBrowse:
            hasher.combine("audiobookBrowse")
        case .podcastBrowse:
            hasher.combine("podcastBrowse")
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
        case let .cultureDetail(id):
            hasher.combine("cultureDetail")
            hasher.combine(id)
        case .subscriptionGate:
            hasher.combine("subscriptionGate")
        case .connectedAccounts:
            hasher.combine("connectedAccounts")
        case let .aiCompanion(contentId):
            hasher.combine("aiCompanion")
            hasher.combine(contentId)
        case let .catchUpSummary(contentId):
            hasher.combine("catchUpSummary")
            hasher.combine(contentId)
        case let .quiz(contentId):
            hasher.combine("quiz")
            hasher.combine(contentId)
        case .watchlist:
            hasher.combine("watchlist")
        case .downloads:
            hasher.combine("downloads")
        case let .judaism(category):
            hasher.combine("judaism")
            hasher.combine(category)
        case let .byocDetail(item):
            hasher.combine("byocDetail")
            hasher.combine(item.id)
        }
    }

    static func == (lhs: TVRoute, rhs: TVRoute) -> Bool {
        switch (lhs, rhs) {
        case let (.player(lId, lType, lCh, lUrl), .player(rId, rType, rCh, rUrl)):
            return lId == rId && lType == rType && lCh == rCh && lUrl == rUrl
        case let (.podcastDetail(lId), .podcastDetail(rId)):
            return lId == rId
        case let (.seriesDetail(lId), .seriesDetail(rId)):
            return lId == rId
        case let (.movieDetail(lId), .movieDetail(rId)):
            return lId == rId
        case let (.actorDetail(lName), .actorDetail(rName)):
            return lName == rName
        case let (.collectionDetail(lId), .collectionDetail(rId)):
            return lId == rId
        case let (.audiobookDetail(lId), .audiobookDetail(rId)):
            return lId == rId
        case (.audiobooks, .audiobooks):
            return true
        case (.audiobookBrowse, .audiobookBrowse):
            return true
        case (.podcastBrowse, .podcastBrowse):
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
        case (.watchlist, .watchlist):
            return true
        case (.downloads, .downloads):
            return true
        case let (.judaism(lCat), .judaism(rCat)):
            return lCat == rCat
        case let (.byocDetail(lItem), .byocDetail(rItem)):
            return lItem.id == rItem.id
        default:
            return false
        }
    }
}
