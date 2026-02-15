import Foundation

/// Represents a parsed push notification payload from Firebase Cloud Messaging.
public struct PushNotification: Sendable {
    /// Notification title
    public let title: String

    /// Notification body
    public let body: String

    /// Optional image URL for rich notifications
    public let imageUrl: String?

    /// Deep link URL for navigation when notification is tapped
    public let deepLink: String?

    /// Notification category for custom actions
    public let category: String?

    /// Custom data payload
    public let data: [String: String]

    /// Notification type for handling
    public let type: NotificationType

    /// Notification ID for tracking
    public let notificationId: String?

    /// Initialize from FCM userInfo dictionary
    public init(userInfo: [AnyHashable: Any]) {
        // Parse APNs payload
        let aps = userInfo["aps"] as? [String: Any]
        let alert = aps?["alert"] as? [String: Any]

        self.title = alert?["title"] as? String ?? ""
        self.body = alert?["body"] as? String ?? ""
        self.imageUrl = userInfo["image_url"] as? String
        self.deepLink = userInfo["deep_link"] as? String
        self.category = aps?["category"] as? String
        self.notificationId = userInfo["notification_id"] as? String

        // Extract custom data (filter out FCM reserved keys)
        var customData: [String: String] = [:]
        let reservedKeys = ["aps", "gcm.message_id", "gcm.n.e", "google.c.a.e", "google.c.a.c_id", "google.c.a.c_l", "google.c.a.ts", "google.c.a.udt"]

        for (key, value) in userInfo {
            if let key = key as? String,
               let value = value as? String,
               !reservedKeys.contains(key) {
                customData[key] = value
            }
        }
        self.data = customData

        // Determine notification type
        if let typeString = userInfo["type"] as? String,
           let type = NotificationType(rawValue: typeString) {
            self.type = type
        } else {
            self.type = .general
        }
    }
}

/// Notification type for handling different notification categories.
public enum NotificationType: String, Codable, Sendable {
    case general = "general"
    case newContent = "new_content"
    case liveEvent = "live_event"
    case epgUpdate = "epg_update"
    case socialMessage = "social_message"
    case betaCredits = "beta_credits"
    case subscription = "subscription"
    case friendRequest = "friend_request"
    case watchParty = "watch_party"
    case systemAlert = "system_alert"
}

// MARK: - CustomStringConvertible

extension PushNotification: CustomStringConvertible {
    public var description: String {
        """
        PushNotification(
            title: "\(title)",
            type: \(type.rawValue),
            deepLink: \(deepLink ?? "nil"),
            notificationId: \(notificationId ?? "nil")
        )
        """
    }
}
