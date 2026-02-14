import Foundation

/// Main tab bar tabs
public enum AppTab: String, CaseIterable, Identifiable, Sendable {
    case home
    case liveTV
    case vod
    case zehAni
    case podcasts
    case search

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .home: return "Home"
        case .liveTV: return "Live"
        case .vod: return "VOD"
        case .zehAni: return "Zeh Ani"
        case .podcasts: return "Podcasts"
        case .search: return "Search"
        }
    }

    public var iconName: String {
        switch self {
        case .home: return "house"
        case .liveTV: return "tv"
        case .vod: return "film"
        case .zehAni: return "person.fill.viewfinder"
        case .podcasts: return "headphones"
        case .search: return "magnifyingglass"
        }
    }

    public var selectedIconName: String {
        switch self {
        case .home: return "house.fill"
        case .liveTV: return "tv.fill"
        case .vod: return "film.fill"
        case .zehAni: return "person.fill.viewfinder"
        case .podcasts: return "headphones"
        case .search: return "magnifyingglass"
        }
    }
}
