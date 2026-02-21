import Foundation

// MARK: - Widget Toggle (Content Card Actions)

/// Request body for POST /api/v1/widgets/toggle
struct WidgetToggleRequest: Encodable, Sendable {
    let contentType: String
    let contentId: String
    let title: String?
    let description: String?
    let icon: String?
    let coverUrl: String?
}

/// Response from POST /api/v1/widgets/toggle
struct WidgetToggleResponse: Decodable, Sendable {
    let isWidget: Bool?
    let widgetId: String?
    let message: String?
}

/// Item for batch widget status check.
struct WidgetCheckItem: Encodable, Sendable {
    let contentType: String
    let contentId: String
}

/// Response from POST /api/v1/widgets/check-batch
struct WidgetCheckBatchResponse: Decodable, Sendable {
    let items: [WidgetCheckResult]?
}

/// Result for a single item in a batch check.
struct WidgetCheckResult: Decodable, Sendable {
    let contentType: String?
    let contentId: String?
    let isWidget: Bool?
}
