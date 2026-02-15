import Foundation

/// FCM topics for targeted notifications.
/// Users can subscribe/unsubscribe from topics to control which notifications they receive.
public enum NotificationTopic: String, CaseIterable, Sendable {
    case news = "news"
    case liveTvUpdates = "live_tv_updates"
    case newMovies = "new_movies"
    case newSeries = "new_series"
    case podcasts = "podcasts"
    case radio = "radio"
    case audiobooks = "audiobooks"
    case betaProgram = "beta_500"
    case culturalContent = "cultural_content"
    case judaismContent = "judaism_content"
    case kidsContent = "kids_content"
    case youngContent = "young_content"
    case socialUpdates = "social_updates"
    case systemAlerts = "system_alerts"

    /// User-facing display name for the topic
    public var displayName: String {
        switch self {
        case .news:
            return "News Updates"
        case .liveTvUpdates:
            return "Live TV Changes"
        case .newMovies:
            return "New Movies"
        case .newSeries:
            return "New Series"
        case .podcasts:
            return "Podcast Updates"
        case .radio:
            return "Radio Programs"
        case .audiobooks:
            return "Audiobook Releases"
        case .betaProgram:
            return "Beta 500 Program"
        case .culturalContent:
            return "Cultural Content"
        case .judaismContent:
            return "Judaism Content"
        case .kidsContent:
            return "Kids Content"
        case .youngContent:
            return "Young Adult Content"
        case .socialUpdates:
            return "Social Activity"
        case .systemAlerts:
            return "System Alerts"
        }
    }

    /// Description of what notifications this topic includes
    public var description: String {
        switch self {
        case .news:
            return "Breaking news and current events"
        case .liveTvUpdates:
            return "EPG changes and live TV schedule updates"
        case .newMovies:
            return "Newly added movies to the library"
        case .newSeries:
            return "New series and episode releases"
        case .podcasts:
            return "New podcast episodes"
        case .radio:
            return "Radio program schedules and highlights"
        case .audiobooks:
            return "New audiobook releases"
        case .betaProgram:
            return "Beta 500 program updates and credit alerts"
        case .culturalContent:
            return "Jewish cultural programming and events"
        case .judaismContent:
            return "Religious content and holiday programming"
        case .kidsContent:
            return "New content for children"
        case .youngContent:
            return "Content for teens and young adults"
        case .socialUpdates:
            return "Friend activity, watch parties, and messages"
        case .systemAlerts:
            return "Important system notifications"
        }
    }

    /// Whether this topic is subscribed by default for new users
    public var isDefaultSubscription: Bool {
        switch self {
        case .news, .newMovies, .newSeries, .systemAlerts:
            return true
        default:
            return false
        }
    }

    /// Icon name for the topic (SF Symbol)
    public var iconName: String {
        switch self {
        case .news:
            return "newspaper"
        case .liveTvUpdates:
            return "tv"
        case .newMovies:
            return "film"
        case .newSeries:
            return "tv.and.mediabox"
        case .podcasts:
            return "mic"
        case .radio:
            return "antenna.radiowaves.left.and.right"
        case .audiobooks:
            return "headphones"
        case .betaProgram:
            return "star.circle"
        case .culturalContent:
            return "theatermasks"
        case .judaismContent:
            return "book.closed"
        case .kidsContent:
            return "person.2"
        case .youngContent:
            return "person.3"
        case .socialUpdates:
            return "bell.badge"
        case .systemAlerts:
            return "exclamationmark.triangle"
        }
    }
}
