import Foundation

/// Main tab bar tabs
public enum AppTab: String, CaseIterable, Identifiable, Sendable {
    case home
    case liveTV
    case vod
    case zehAni
    case podcasts
    case search
    case discover
    case downloads

    public var id: String {
        rawValue
    }

    /// Fallback title (English). Prefer `localizationKey` with LocalizationManager.
    public var title: String {
        switch self {
        case .home: return "Home"
        case .liveTV: return "Live"
        case .vod: return "VOD"
        case .zehAni: return "Zeh Ani"
        case .podcasts: return "Listen"
        case .search: return "Search"
        case .discover: return "Discover"
        case .downloads: return "Downloads"
        }
    }

    /// i18n key for the tab label.
    public var localizationKey: String {
        switch self {
        case .home: return "nav.home"
        case .liveTV: return "nav.liveTV"
        case .vod: return "nav.vod"
        case .zehAni: return "nav.zehAni"
        case .podcasts: return "listen.title"
        case .search: return "nav.search"
        case .discover: return "nav.discover"
        case .downloads: return "downloads.title"
        }
    }

    /// Whether the tab has a valid i18n key. Tabs without a key use `title`.
    public var hasLocalizationKey: Bool {
        switch self {
        case .home, .vod, .search, .discover, .podcasts, .downloads: return true
        case .liveTV, .zehAni: return false
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
        case .discover: return "sparkles"
        case .downloads: return "arrow.down.circle"
        }
    }

    /// Whether this tab requires the owner's private content library.
    public var requiresOwnerMode: Bool {
        switch self {
        case .vod, .downloads:
            return true
        case .home, .liveTV, .zehAni, .podcasts, .search, .discover:
            return false
        }
    }

    /// Tabs hidden from the bottom navigation bar.
    public var isHiddenFromTabBar: Bool {
        switch self {
        case .downloads: return true
        default: return false
        }
    }

    /// Tabs visible for the given owner mode.
    public static func visibleTabs(ownerMode: Bool) -> [AppTab] {
        allCases.filter { !$0.isHiddenFromTabBar && (ownerMode || !$0.requiresOwnerMode) }
    }

    public var selectedIconName: String {
        switch self {
        case .home: return "house.fill"
        case .liveTV: return "tv.fill"
        case .vod: return "film.fill"
        case .zehAni: return "person.fill.viewfinder"
        case .podcasts: return "headphones"
        case .search: return "magnifyingglass"
        case .discover: return "sparkles"
        case .downloads: return "arrow.down.circle.fill"
        }
    }
}
