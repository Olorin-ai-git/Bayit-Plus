import Foundation

/// Notification action identifiers for interactive notifications.
public enum NotificationAction: String, Sendable {
    case play = "PLAY_ACTION"
    case addToFavorites = "ADD_TO_FAVORITES_ACTION"
    case dismiss = "DISMISS_ACTION"
    case view = "VIEW_ACTION"
    case reply = "REPLY_ACTION"
    case accept = "ACCEPT_ACTION"
    case decline = "DECLINE_ACTION"
    case join = "JOIN_ACTION"

    /// User-facing title for the action
    public var title: String {
        switch self {
        case .play:
            return "Play"
        case .addToFavorites:
            return "Add to Favorites"
        case .dismiss:
            return "Dismiss"
        case .view:
            return "View"
        case .reply:
            return "Reply"
        case .accept:
            return "Accept"
        case .decline:
            return "Decline"
        case .join:
            return "Join"
        }
    }

    /// Whether this action is destructive (red color)
    public var isDestructive: Bool {
        switch self {
        case .dismiss, .decline:
            return true
        default:
            return false
        }
    }

    /// Whether this action requires foreground launch
    public var requiresForeground: Bool {
        switch self {
        case .play, .view, .join:
            return true
        default:
            return false
        }
    }
}

/// Notification category identifiers for grouping related notifications.
public enum NotificationCategory: String, Sendable {
    case newContent = "NEW_CONTENT"
    case liveEvent = "LIVE_EVENT"
    case socialMessage = "SOCIAL_MESSAGE"
    case friendRequest = "FRIEND_REQUEST"
    case watchParty = "WATCH_PARTY"
    case systemAlert = "SYSTEM_ALERT"

    /// Actions available for this category
    public var actions: [NotificationAction] {
        switch self {
        case .newContent:
            return [.play, .addToFavorites, .dismiss]
        case .liveEvent:
            return [.view, .dismiss]
        case .socialMessage:
            return [.reply, .view, .dismiss]
        case .friendRequest:
            return [.accept, .decline]
        case .watchParty:
            return [.join, .decline]
        case .systemAlert:
            return [.view, .dismiss]
        }
    }
}
