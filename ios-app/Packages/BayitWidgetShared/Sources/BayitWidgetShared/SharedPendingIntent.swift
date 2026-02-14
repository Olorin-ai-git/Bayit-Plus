import Foundation

/// A pending intent action written by the widget extension, consumed by the main app.
public struct SharedPendingIntent: Codable, Sendable {
    public let action: String
    public let contentID: String?
    public let contentType: SharedContentType?
    public let timestamp: Date
    public let nonce: String

    /// Allowed action types that widgets can request.
    public static let allowedActions: Set<String> = PendingIntentActions.allActions

    /// Intent expiration time in seconds.
    private static let expirationSeconds: TimeInterval = 300

    public init(
        action: String,
        contentID: String? = nil,
        contentType: SharedContentType? = nil,
        timestamp: Date = .now,
        nonce: String = UUID().uuidString
    ) {
        self.action = action
        self.contentID = contentID
        self.contentType = contentType
        self.timestamp = timestamp
        self.nonce = nonce
    }

    /// Validate that this intent is still valid and allowed.
    public func isValid() -> Bool {
        // Check expiration (5 minutes)
        guard Date().timeIntervalSince(timestamp) < Self.expirationSeconds else {
            return false
        }

        // Validate action against allowlist
        guard Self.allowedActions.contains(action) else {
            return false
        }

        return true
    }
}
