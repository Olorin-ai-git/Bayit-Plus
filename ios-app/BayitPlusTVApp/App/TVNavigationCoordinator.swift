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
    case culture
    case household
    case recordings
    case epg
    case favorites
    case watchParty
    case trivia
    case friends
    case rewards
    case betaCredits
    case search
    case profile
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
        case .culture: return "Culture"
        case .household: return "Household"
        case .recordings: return "Recordings"
        case .epg: return "Guide"
        case .favorites: return "Favorites"
        case .watchParty: return "Watch Party"
        case .trivia: return "Trivia"
        case .friends: return "Friends"
        case .rewards: return "Rewards"
        case .betaCredits: return "Beta"
        case .search: return "Search"
        case .profile: return "Profile"
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
        case .culture: return "building.columns"
        case .household: return "house.fill"
        case .recordings: return "record.circle"
        case .epg: return "calendar"
        case .favorites: return "heart"
        case .watchParty: return "tv.and.hifispeaker.fill"
        case .trivia: return "questionmark.circle"
        case .friends: return "person.2"
        case .rewards: return "trophy"
        case .betaCredits: return "sparkles"
        case .search: return "magnifyingglass"
        case .profile: return "person.crop.circle"
        case .settings: return "gear"
        }
    }
}

/// Manages navigation state for the tvOS app.
@Observable
final class TVNavigationCoordinator {
    var selectedTab: TVTab = .home
    var showingAuth: Bool = false
    var showingSplash: Bool = true
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
