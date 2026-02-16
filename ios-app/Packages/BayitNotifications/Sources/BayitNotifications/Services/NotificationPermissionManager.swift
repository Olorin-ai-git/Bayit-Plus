import BayitCore
import Foundation
import UserNotifications

#if canImport(UIKit)
import UIKit
#endif

/// Manages notification permissions and authorization.
public actor NotificationPermissionManager {

    private let logger = BayitLogger(category: "NotificationPermissionManager")
    private let center = UNUserNotificationCenter.current()

    public init() {}

    // MARK: - Permission Request

    /// Request notification permissions from user.
    /// - Returns: True if permissions were granted
    public func requestPermissions() async throws -> Bool {
        let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])

        if granted {
            logger.info("Notification permissions granted")
            await registerForRemoteNotifications()
        } else {
            logger.warning("Notification permissions denied")
        }

        return granted
    }

    /// Check current notification authorization status.
    public func checkPermissionStatus() async -> UNAuthorizationStatus {
        let settings = await center.notificationSettings()
        logger.info("Notification permission status", context: [
            "authorizationStatus": "\(settings.authorizationStatus.rawValue)",
            "alertSetting": "\(settings.alertSetting.rawValue)",
            "soundSetting": "\(settings.soundSetting.rawValue)",
            "badgeSetting": "\(settings.badgeSetting.rawValue)"
        ])
        return settings.authorizationStatus
    }

    /// Check if notifications are enabled (authorized and not disabled in settings).
    public func areNotificationsEnabled() async -> Bool {
        let status = await checkPermissionStatus()
        return status == .authorized || status == .provisional
    }

    // MARK: - APNs Registration

    /// Register for remote notifications (APNs).
    @MainActor
    private func registerForRemoteNotifications() {
        #if canImport(UIKit)
        UIApplication.shared.registerForRemoteNotifications()
        logger.info("Registered for remote notifications (APNs)")
        #endif
    }

    // MARK: - Settings

    /// Open app settings so user can change notification permissions.
    @MainActor
    public func openAppSettings() {
        #if canImport(UIKit)
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
            logger.info("Opened app settings")
        }
        #endif
    }

    // MARK: - Notification Categories

    /// Register notification categories for interactive notifications.
    public func registerNotificationCategories() async {
        let categories = NotificationCategory.allCases.map { category in
            createCategory(for: category)
        }

        center.setNotificationCategories(Set(categories))
        logger.info("Registered notification categories", context: [
            "count": "\(categories.count)"
        ])
    }

    private func createCategory(for category: NotificationCategory) -> UNNotificationCategory {
        let actions = category.actions.map { action in
            createAction(for: action)
        }

        return UNNotificationCategory(
            identifier: category.rawValue,
            actions: actions,
            intentIdentifiers: [],
            options: []
        )
    }

    private func createAction(for action: NotificationAction) -> UNNotificationAction {
        var options: UNNotificationActionOptions = []

        if action.isDestructive {
            options.insert(.destructive)
        }

        if action.requiresForeground {
            options.insert(.foreground)
        }

        if action == .reply {
            return UNTextInputNotificationAction(
                identifier: action.rawValue,
                title: action.title,
                options: options,
                textInputButtonTitle: "Send",
                textInputPlaceholder: "Type your message..."
            )
        } else {
            return UNNotificationAction(
                identifier: action.rawValue,
                title: action.title,
                options: options
            )
        }
    }

    // MARK: - Badge Management

    /// Set app badge number.
    @MainActor
    public func setBadgeCount(_ count: Int) {
        #if canImport(UIKit)
        UNUserNotificationCenter.current().setBadgeCount(count) { error in
            if let error = error {
                self.logger.error("Failed to set badge count", error: error)
            } else {
                self.logger.info("Set badge count", context: ["count": "\(count)"])
            }
        }
        #endif
    }

    /// Clear app badge.
    @MainActor
    public func clearBadge() {
        setBadgeCount(0)
    }
}
