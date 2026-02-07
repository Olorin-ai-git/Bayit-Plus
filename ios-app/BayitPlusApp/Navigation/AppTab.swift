import Foundation

/// Main tab bar tabs
public enum AppTab: String, CaseIterable, Identifiable, Sendable {
    case home
    case liveTV
    case vod
    case radio
    case podcasts

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .home: return "Home"
        case .liveTV: return "Live"
        case .vod: return "VOD"
        case .radio: return "Radio"
        case .podcasts: return "Podcasts"
        }
    }

    public var iconName: String {
        switch self {
        case .home: return "house"
        case .liveTV: return "tv"
        case .vod: return "film"
        case .radio: return "radio"
        case .podcasts: return "headphones"
        }
    }

    public var selectedIconName: String {
        switch self {
        case .home: return "house.fill"
        case .liveTV: return "tv.fill"
        case .vod: return "film.fill"
        case .radio: return "radio.fill"
        case .podcasts: return "headphones"
        }
    }
}
