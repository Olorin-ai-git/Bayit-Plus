import Foundation
import Observation
import SwiftUI

/// tvOS tab definitions
enum TVTab: String, CaseIterable, Identifiable, Sendable {
    case home
    case liveTV
    case vod
    case podcasts
    case audiobooks
    case children
    case judaism
    case flows
    case household
    case recordings
    case epg
    case favorites
    case watchParty
    case search
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: return "Home"
        case .liveTV: return "Live"
        case .vod: return "VOD"
        case .podcasts: return "Podcasts"
        case .audiobooks: return "Audiobooks"
        case .children: return "Kids"
        case .judaism: return "Judaism"
        case .flows: return "Flows"
        case .household: return "Household"
        case .recordings: return "Recordings"
        case .epg: return "Guide"
        case .favorites: return "Favorites"
        case .watchParty: return "Watch Party"
        case .search: return "Search"
        case .settings: return "Settings"
        }
    }

    var iconName: String {
        switch self {
        case .home: return "house"
        case .liveTV: return "tv"
        case .vod: return "film"
        case .podcasts: return "headphones"
        case .audiobooks: return "book.closed"
        case .children: return "figure.and.child.holdinghands"
        case .judaism: return "star.of.david"
        case .flows: return "line.3.horizontal.decrease.circle"
        case .household: return "house.fill"
        case .recordings: return "record.circle"
        case .epg: return "calendar"
        case .favorites: return "heart"
        case .watchParty: return "tv.and.hifispeaker.fill"
        case .search: return "magnifyingglass"
        case .settings: return "gear"
        }
    }
}

/// Manages navigation state for the tvOS app.
@Observable
final class TVNavigationCoordinator {
    var selectedTab: TVTab = .home
    var showingAuth: Bool = false
    var paths: [TVTab: NavigationPath] = [:]

    init() {
        for tab in TVTab.allCases {
            paths[tab] = NavigationPath()
        }
    }

    func popToRoot() {
        paths[selectedTab] = NavigationPath()
    }
}
