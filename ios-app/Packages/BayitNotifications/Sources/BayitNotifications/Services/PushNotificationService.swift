import BayitCore
import BayitNetworking
import FirebaseMessaging
import Foundation
import UserNotifications

/// Main service for handling push notifications via Firebase Cloud Messaging.
@MainActor
public final class PushNotificationService: NSObject, ObservableObject {

    private let logger = BayitLogger(category: "PushNotificationService")
    private let apiClient: APIClient
    private let tokenManager: FCMTokenManager
    private let permissionManager: NotificationPermissionManager

    /// Published state for SwiftUI observation
    @Published public private(set) var isInitialized = false
    @Published public private(set) var hasPermission = false

    /// Closure called when notification is received in foreground.
    public var onForegroundNotification: (@Sendable (PushNotification) -> Void)?

    /// Closure called when user taps notification.
    public var onNotificationTapped: (@Sendable (PushNotification) -> Void)?

    /// Closure called when user performs action on notification.
    public var onNotificationAction: (@Sendable (PushNotification, NotificationAction) -> Void)?

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
        self.tokenManager = FCMTokenManager(apiClient: apiClient)
        self.permissionManager = NotificationPermissionManager()

        super.init()

        // Set FCM delegate
        Messaging.messaging().delegate = self

        // Set UNUserNotificationCenter delegate
        UNUserNotificationCenter.current().delegate = self
    }

    // MARK: - Initialization

    /// Initialize push notifications (call on app launch).
    public func initialize() async throws {
        logger.info("Initializing push notifications")

        // Register notification categories
        await permissionManager.registerNotificationCategories()

        // Request permissions
        let granted = try await permissionManager.requestPermissions()
        hasPermission = granted

        if granted {
            // Register token with backend
            do {
                try await tokenManager.registerToken()
            } catch {
                logger.error("Failed to register FCM token", error: error)
                // Don't throw - allow app to continue even if token registration fails
            }

            // Subscribe to default topics
            await subscribeToDefaultTopics()
        }

        isInitialized = true
        logger.info("Push notifications initialized successfully", context: [
            "hasPermission": "\(granted)"
        ])
    }

    /// Handle APNs device token registration.
    public func didRegisterForRemoteNotifications(withDeviceToken deviceToken: Data) {
        logger.info("Registered for APNs", context: [
            "tokenLength": "\(deviceToken.count)"
        ])

        // Forward to FCM
        Messaging.messaging().apnsToken = deviceToken
    }

    /// Handle APNs registration failure.
    public func didFailToRegisterForRemoteNotifications(withError error: Error) {
        logger.error("Failed to register for APNs", error: error)
    }

    // MARK: - Topic Management

    /// Subscribe to notification topic.
    public func subscribe(to topic: NotificationTopic) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Messaging.messaging().subscribe(toTopic: topic.rawValue) { error in
                if let error = error {
                    self.logger.error("Failed to subscribe to topic", error: error, context: ["topic": topic.rawValue])
                    continuation.resume(throwing: error)
                } else {
                    self.logger.info("Subscribed to topic", context: ["topic": topic.rawValue])
                    continuation.resume()
                }
            }
        }
    }

    /// Unsubscribe from notification topic.
    public func unsubscribe(from topic: NotificationTopic) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Messaging.messaging().unsubscribe(fromTopic: topic.rawValue) { error in
                if let error = error {
                    self.logger.error("Failed to unsubscribe from topic", error: error, context: ["topic": topic.rawValue])
                    continuation.resume(throwing: error)
                } else {
                    self.logger.info("Unsubscribed from topic", context: ["topic": topic.rawValue])
                    continuation.resume()
                }
            }
        }
    }

    /// Subscribe to default topics for new users.
    private func subscribeToDefaultTopics() async {
        let defaultTopics = NotificationTopic.allCases.filter { $0.isDefaultSubscription }

        logger.info("Subscribing to default topics", context: [
            "count": "\(defaultTopics.count)"
        ])

        for topic in defaultTopics {
            do {
                try await subscribe(to: topic)
            } catch {
                logger.error("Failed to subscribe to default topic", error: error, context: [
                    "topic": topic.rawValue
                ])
            }
        }
    }

    // MARK: - Permission Management

    /// Check if user has granted notification permissions.
    public func checkPermissionStatus() async -> UNAuthorizationStatus {
        await permissionManager.checkPermissionStatus()
    }

    /// Request notification permissions if not already granted.
    public func requestPermissionsIfNeeded() async throws -> Bool {
        let status = await checkPermissionStatus()

        if status == .notDetermined {
            let granted = try await permissionManager.requestPermissions()
            hasPermission = granted
            return granted
        }

        let enabled = await permissionManager.areNotificationsEnabled()
        hasPermission = enabled
        return enabled
    }

    /// Open app settings for user to enable notifications.
    public func openAppSettings() {
        permissionManager.openAppSettings()
    }

    // MARK: - Badge Management

    /// Set app badge count.
    public func setBadgeCount(_ count: Int) {
        permissionManager.setBadgeCount(count)
    }

    /// Clear app badge.
    public func clearBadge() {
        permissionManager.clearBadge()
    }

    // MARK: - Cleanup

    /// Clean up on logout.
    public func cleanup() async throws {
        logger.info("Cleaning up push notifications")

        // Unregister token from backend
        do {
            try await tokenManager.unregisterToken()
        } catch {
            logger.error("Failed to unregister token", error: error)
        }

        // Delete FCM token
        do {
            try await tokenManager.deleteToken()
        } catch {
            logger.error("Failed to delete FCM token", error: error)
        }

        // Clear badge
        clearBadge()

        isInitialized = false
        hasPermission = false

        logger.info("Push notifications cleaned up")
    }
}

// MARK: - MessagingDelegate

extension PushNotificationService: MessagingDelegate {

    /// Called when FCM token is refreshed.
    public func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }

        logger.info("FCM token refreshed", context: ["tokenPrefix": String(token.prefix(10))])

        // Handle token refresh
        Task {
            await tokenManager.handleTokenRefresh(token)
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationService: UNUserNotificationCenterDelegate {

    /// Called when notification is received in foreground.
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        let pushNotification = PushNotification(userInfo: userInfo)

        logger.info("Received foreground notification", context: [
            "type": pushNotification.type.rawValue,
            "title": pushNotification.title
        ])

        // Notify observers
        onForegroundNotification?(pushNotification)

        // Show notification banner, play sound, and update badge
        completionHandler([.banner, .sound, .badge])
    }

    /// Called when user taps notification.
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let pushNotification = PushNotification(userInfo: userInfo)

        logger.info("Notification tapped", context: [
            "type": pushNotification.type.rawValue,
            "actionIdentifier": response.actionIdentifier
        ])

        // Handle default action (tap on notification body)
        if response.actionIdentifier == UNNotificationDefaultActionIdentifier {
            onNotificationTapped?(pushNotification)
        }
        // Handle custom actions
        else if response.actionIdentifier != UNNotificationDismissActionIdentifier {
            if let action = NotificationAction(rawValue: response.actionIdentifier) {
                onNotificationAction?(pushNotification, action)
            }
        }

        completionHandler()
    }
}
