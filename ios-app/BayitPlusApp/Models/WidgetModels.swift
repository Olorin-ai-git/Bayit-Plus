import Foundation

// MARK: - Widget Enums

/// Type of widget (system-provided or user-created)
enum WidgetType: String, Decodable, Sendable {
    case system
    case personal
}

/// Content type a widget can display
enum WidgetContentType: String, Decodable, Sendable, CaseIterable {
    case liveChannel = "live_channel"
    case iframe
    case podcast
    case vod
    case radio
    case live
    case custom
    case audiobook

    /// SF Symbol icon name for this content type
    var iconName: String {
        switch self {
        case .liveChannel, .live: return "tv"
        case .podcast: return "mic"
        case .radio: return "radio"
        case .vod: return "film"
        case .audiobook: return "book"
        case .iframe: return "globe"
        case .custom: return "square.grid.2x2"
        }
    }

    /// Badge variant color for this content type
    var badgeVariant: String {
        switch self {
        case .liveChannel, .live: return "primary"
        case .podcast: return "success"
        case .radio: return "warning"
        case .vod, .audiobook: return "info"
        case .iframe: return "secondary"
        case .custom: return "primary"
        }
    }

    /// Display label for UI badges
    var displayLabel: String {
        switch self {
        case .liveChannel: return "Live Channel"
        case .iframe: return "Web"
        case .podcast: return "Podcast"
        case .vod: return "VOD"
        case .radio: return "Radio"
        case .live: return "Live"
        case .custom: return "Custom"
        case .audiobook: return "Audiobook"
        }
    }
}

// MARK: - Widget Position

/// Position and sizing of a widget on the dock grid
struct WidgetPosition: Decodable, Sendable {
    let x: Double
    let y: Double
    let width: Int
    let height: Int
    let zIndex: Int?
}

// MARK: - Widget Content

/// Content configuration within a widget
struct WidgetContent: Decodable, Sendable {
    let contentType: WidgetContentType?
    let liveChannelId: String?
    let podcastId: String?
    let contentId: String?
    let stationId: String?
    let audiobookId: String?
    let iframeUrl: String?
    let iframeTitle: String?
    let componentName: String?
}

// MARK: - Widget Item

/// A single widget belonging to the user
struct WidgetItem: Decodable, Sendable, Identifiable {
    let id: String
    let userId: String?
    let title: String
    let description: String?
    let type: WidgetType
    let systemWidgetId: String?
    let icon: String?
    let position: WidgetPosition?
    let content: WidgetContent?
    let isVisible: Bool?
    let isMinimized: Bool?
    let coverUrl: String?
    let createdAt: String?
    let updatedAt: String?
}

// MARK: - Available System Widget

/// A system widget that can be added, with its current subscription status
struct AvailableSystemWidget: Decodable, Sendable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let icon: String?
    let coverUrl: String?
    let content: WidgetContent?
    let isAdded: Bool

    enum CodingKeys: String, CodingKey {
        case id, title, description, icon, content, isAdded
        case coverUrl = "cover_url"
    }
}

// MARK: - API Response Types

/// Response from GET /api/v1/widgets
struct WidgetsListResponse: Decodable, Sendable {
    let items: [WidgetItem]
    let total: Int
}

/// Response from GET /api/v1/widgets/system/available
struct AvailableSystemWidgetsResponse: Decodable, Sendable {
    let items: [AvailableSystemWidget]
    let total: Int
}

/// Response from POST /api/v1/widgets/system/{id}/add
struct WidgetActionResponse: Decodable, Sendable {
    let message: String
    let id: String?
    let widgetId: String?
}

/// Response from DELETE /api/v1/widgets/system/{id}/remove
struct WidgetDeleteResponse: Decodable, Sendable {
    let message: String
}

// MARK: - Widget Creation

/// Encodable content for creating a personal widget.
struct WidgetContentPayload: Encodable, Sendable {
    let contentType: String
    let liveChannelId: String?
    let podcastId: String?
    let contentId: String?
    let stationId: String?
    let iframeUrl: String?
    let iframeTitle: String?
}

/// Request body for POST /admin/widgets (personal widget creation).
struct CreateWidgetRequest: Encodable, Sendable {
    let title: String
    let description: String?
    let icon: String?
    let content: WidgetContentPayload
}

/// Response from POST /admin/widgets
struct CreateWidgetResponse: Decodable, Sendable {
    let id: String?
    let title: String?
    let message: String?
}
