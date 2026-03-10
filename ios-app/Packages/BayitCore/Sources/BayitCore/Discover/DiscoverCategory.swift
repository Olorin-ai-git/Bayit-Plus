import Foundation

public enum DiscoverCategory: String, CaseIterable, Sendable, Identifiable {
    case watchingMovies = "watching_movies"
    case watchingLiveTV = "watching_live_tv"
    case learnHebrew = "learn_hebrew"
    case searchDiscovery = "search_discovery"
    case chatAssistants = "chat_assistants"

    public var id: String {
        rawValue
    }

    public var nameKey: String {
        "discover.category.\(rawValue)"
    }

    public var iconName: String {
        switch self {
        case .watchingMovies: return "film"
        case .watchingLiveTV: return "play.tv"
        case .learnHebrew: return "character.book.closed"
        case .searchDiscovery: return "magnifyingglass"
        case .chatAssistants: return "bubble.left.and.bubble.right"
        }
    }

    public var sortOrder: Int {
        switch self {
        case .watchingMovies: return 0
        case .watchingLiveTV: return 1
        case .learnHebrew: return 2
        case .searchDiscovery: return 3
        case .chatAssistants: return 4
        }
    }
}
