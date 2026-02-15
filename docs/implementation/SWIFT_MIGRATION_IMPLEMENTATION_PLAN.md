# Swift iOS Migration Implementation Plan

**Date:** 2026-02-14
**Status:** Ready for Implementation
**Timeline:** 3 weeks
**Blockers:** None (Android handled by separate Kotlin app)

---

## Executive Summary

This document provides a **production-ready implementation plan** for the 3 critical features missing in the Swift iOS app that exist in React Native:

1. **Firebase Cloud Messaging (FCM)** - Push notifications
2. **Google Cast SDK** - Chromecast video casting
3. **Error Tracking** - Firebase Crashlytics

All other React Native features are either already implemented in Swift or Swift has superior implementations.

**Total Implementation Time:** ~3 weeks (15 working days)

---

## Implementation Priorities

| Priority | Feature | Effort | Impact | Risk |
|----------|---------|--------|--------|------|
| **P0** | Firebase Crashlytics | 0.5 days | Critical | Low |
| **P0** | Firebase Cloud Messaging | 3 days | Critical | Medium |
| **P1** | Google Cast SDK | 5 days | High | Medium |

---

# PHASE 1: ERROR TRACKING (Day 1 - 0.5 days)

## 1.1 Firebase Crashlytics Implementation

### Why This First?
- **Immediate production need** - Currently blind to crashes
- **Quick win** - 4 hours to implement
- **Enables monitoring** during FCM/Cast implementation

### Step 1.1.1: Update Package.swift Dependencies

**File:** `/ios-app/Package.swift`

```swift
dependencies: [
    .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "11.0.0"),
    .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "8.0.0"),
    .package(url: "https://github.com/warrenm/GLTFKit2.git", from: "0.5.0"),
],
```

**Update BayitAnalytics target:**

```swift
// MARK: - BayitAnalytics
.target(
    name: "BayitAnalytics",
    dependencies: [
        "BayitCore",
        .product(name: "FirebaseAnalytics", package: "firebase-ios-sdk"),
        .product(name: "FirebaseCrashlytics", package: "firebase-ios-sdk"),  // ADD THIS
    ],
    path: "Packages/BayitAnalytics/Sources/BayitAnalytics"
),
```

### Step 1.1.2: Initialize Crashlytics

**File:** `/ios-app/BayitPlusApp/App/BayitPlusApp.swift`

```swift
import BayitAuth
import BayitCore
import BayitLocalization
import BayitMedia
import BayitNetworking
import BayitWidgetShared
import FirebaseCore
import FirebaseCrashlytics  // ADD THIS
import GoogleSignIn
import SwiftUI

@main
struct BayitPlusApp: App {
    // ... existing state ...

    init() {
        FirebaseApp.configure()

        // Initialize Crashlytics
        Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)

        // ... rest of init ...
    }

    // ... rest of app ...
}
```

### Step 1.1.3: Create CrashlyticsService

**File:** `/ios-app/BayitPlusApp/Services/CrashlyticsService.swift`

```swift
import BayitCore
import FirebaseCrashlytics
import Foundation

/// Service for logging errors and crashes to Firebase Crashlytics.
final class CrashlyticsService {

    private let logger = BayitLogger(category: "CrashlyticsService")
    private let crashlytics = Crashlytics.crashlytics()

    // MARK: - User Context

    /// Set user identifier for crash reports.
    func setUserID(_ userID: String) {
        crashlytics.setUserID(userID)
        logger.info("Set Crashlytics user ID", context: ["userID": userID])
    }

    /// Clear user identifier (on logout).
    func clearUserID() {
        crashlytics.setUserID("")
        logger.info("Cleared Crashlytics user ID")
    }

    /// Set custom key-value pair for crash context.
    func setCustomValue(_ value: String, forKey key: String) {
        crashlytics.setCustomValue(value, forKey: key)
    }

    // MARK: - Error Logging

    /// Log non-fatal error to Crashlytics.
    func logError(_ error: Error, context: [String: String] = [:]) {
        // Add context as custom keys
        for (key, value) in context {
            crashlytics.setCustomValue(value, forKey: key)
        }

        crashlytics.record(error: error)
        logger.error("Logged error to Crashlytics", error: error, context: context)
    }

    /// Log non-fatal error with custom message.
    func logError(_ message: String, context: [String: String] = [:]) {
        let error = NSError(
            domain: "tv.bayit.app",
            code: -1,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
        logError(error, context: context)
    }

    // MARK: - Breadcrumbs

    /// Log breadcrumb for crash context.
    func log(_ message: String, context: [String: String] = [:]) {
        crashlytics.log(message)

        for (key, value) in context {
            crashlytics.setCustomValue(value, forKey: key)
        }
    }

    // MARK: - Force Crash (Testing Only)

    #if DEBUG
    /// Force a crash for testing Crashlytics integration.
    /// **WARNING:** Only call this in DEBUG builds for testing.
    func forceCrashForTesting() {
        fatalError("Test crash from CrashlyticsService")
    }
    #endif
}
```

### Step 1.1.4: Integrate with BayitLogger

**File:** `/ios-app/Packages/BayitCore/Sources/BayitCore/Logger.swift`

**Update BayitLogger to send errors to Crashlytics:**

```swift
import FirebaseCrashlytics
import Foundation
import os.log

public final class BayitLogger {
    // ... existing code ...

    private static var crashlyticsEnabled = true

    public func error(_ message: String, error: Error? = nil, context: [String: String] = [:]) {
        let logMessage = formatMessage(message, context: context)
        os_log("%{public}@", log: osLog, type: .error, logMessage)

        // Send to Crashlytics if enabled
        if Self.crashlyticsEnabled {
            let crashlytics = Crashlytics.crashlytics()

            // Add context
            for (key, value) in context {
                crashlytics.setCustomValue(value, forKey: key)
            }

            // Log error
            if let error = error {
                crashlytics.record(error: error)
            } else {
                let nsError = NSError(
                    domain: "tv.bayit.app",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: message]
                )
                crashlytics.record(error: nsError)
            }
        }
    }

    // ... rest of logger ...
}
```

### Step 1.1.5: Update Info.plist

**File:** `/ios-app/BayitPlusApp/Info.plist`

Add Crashlytics data collection flag:

```xml
<key>FirebaseCrashlyticsCollectionEnabled</key>
<true/>
```

### Step 1.1.6: Testing

**Test Checklist:**
1. [ ] Build succeeds with new dependency
2. [ ] App launches without crashes
3. [ ] Force test crash in DEBUG mode
4. [ ] Verify crash appears in Firebase Console within 5 minutes
5. [ ] Test non-fatal error logging
6. [ ] Verify user ID appears in crash reports
7. [ ] Verify custom keys appear in crash context

**Test Code (DEBUG only):**

```swift
#if DEBUG
// In a test button action:
CrashlyticsService().forceCrashForTesting()
#endif
```

### Deliverables:
- [x] Firebase Crashlytics dependency added
- [x] CrashlyticsService created
- [x] BayitLogger integration
- [x] Test crash verified in console
- [x] Documentation updated

**Time Estimate:** 4 hours

---

# PHASE 2: FIREBASE CLOUD MESSAGING (Days 2-4 - 3 days)

## 2.1 FCM Implementation

### Why FCM?
- **Critical feature** - Push notifications for engagement
- **User retention** - Re-engagement campaigns, content alerts
- **Live updates** - EPG changes, new content notifications

### Architecture Overview

```
Backend → FCM API → APNs → iOS Device
                              ↓
                    PushNotificationService
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
            Foreground Handler    Deep Link Handler
                    ↓                   ↓
            Show in-app alert    Navigate to content
```

### Step 2.1.1: Update Package.swift Dependencies

**File:** `/ios-app/Package.swift`

```swift
// MARK: - BayitNotifications (NEW PACKAGE)
.target(
    name: "BayitNotifications",
    dependencies: [
        "BayitCore",
        "BayitNetworking",
        .product(name: "FirebaseMessaging", package: "firebase-ios-sdk"),
    ],
    path: "Packages/BayitNotifications/Sources/BayitNotifications"
),
```

### Step 2.1.2: Create BayitNotifications Package

**Directory Structure:**
```
Packages/BayitNotifications/
├── Sources/
│   └── BayitNotifications/
│       ├── Models/
│       │   ├── PushNotification.swift
│       │   ├── NotificationTopic.swift
│       │   └── NotificationAction.swift
│       ├── Services/
│       │   ├── PushNotificationService.swift
│       │   ├── FCMTokenManager.swift
│       │   └── NotificationPermissionManager.swift
│       └── Handlers/
│           ├── NotificationForegroundHandler.swift
│           └── NotificationActionHandler.swift
└── Tests/
    └── BayitNotificationsTests/
```

### Step 2.1.3: Create Models

**File:** `/ios-app/Packages/BayitNotifications/Sources/BayitNotifications/Models/PushNotification.swift`

```swift
import Foundation

/// Represents a parsed push notification payload.
public struct PushNotification: Codable {
    /// Notification title
    public let title: String

    /// Notification body
    public let body: String

    /// Optional image URL
    public let imageUrl: String?

    /// Deep link URL for navigation
    public let deepLink: String?

    /// Notification category for actions
    public let category: String?

    /// Custom data payload
    public let data: [String: String]

    /// Notification type
    public let type: NotificationType

    public init(userInfo: [AnyHashable: Any]) {
        // Parse FCM payload
        let aps = userInfo["aps"] as? [String: Any]
        let alert = aps?["alert"] as? [String: Any]

        self.title = alert?["title"] as? String ?? ""
        self.body = alert?["body"] as? String ?? ""
        self.imageUrl = userInfo["image_url"] as? String
        self.deepLink = userInfo["deep_link"] as? String
        self.category = aps?["category"] as? String

        // Extract custom data
        var customData: [String: String] = [:]
        for (key, value) in userInfo {
            if let key = key as? String,
               let value = value as? String,
               !["aps", "gcm.message_id", "google.c.a.e"].contains(key) {
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
public enum NotificationType: String, Codable {
    case general = "general"
    case newContent = "new_content"
    case liveEvent = "live_event"
    case epgUpdate = "epg_update"
    case socialMessage = "social_message"
    case betaCredits = "beta_credits"
    case subscription = "subscription"
}
```

**File:** `/ios-app/Packages/BayitNotifications/Sources/BayitNotifications/Models/NotificationTopic.swift`

```swift
import Foundation

/// FCM topics for targeted notifications.
public enum NotificationTopic: String, CaseIterable {
    case news = "news"
    case liveTvUpdates = "live_tv_updates"
    case newMovies = "new_movies"
    case newSeries = "new_series"
    case podcasts = "podcasts"
    case radio = "radio"
    case betaProgram = "beta_500"
    case culturalContent = "cultural_content"
    case judaismContent = "judaism_content"
    case kidsContent = "kids_content"

    /// User-facing display name
    public var displayName: String {
        switch self {
        case .news: return "News Updates"
        case .liveTvUpdates: return "Live TV Changes"
        case .newMovies: return "New Movies"
        case .newSeries: return "New Series"
        case .podcasts: return "Podcast Updates"
        case .radio: return "Radio Programs"
        case .betaProgram: return "Beta 500 Program"
        case .culturalContent: return "Cultural Content"
        case .judaismContent: return "Judaism Content"
        case .kidsContent: return "Kids Content"
        }
    }
}
```

**File:** `/ios-app/Packages/BayitNotifications/Sources/BayitNotifications/Models/NotificationAction.swift`

```swift
import Foundation

/// Notification action identifiers.
public enum NotificationAction: String {
    case play = "PLAY_ACTION"
    case addToFavorites = "ADD_TO_FAVORITES_ACTION"
    case dismiss = "DISMISS_ACTION"
    case view = "VIEW_ACTION"
}

/// Notification category identifiers.
public enum NotificationCategory: String {
    case newContent = "NEW_CONTENT"
    case liveEvent = "LIVE_EVENT"
    case socialMessage = "SOCIAL_MESSAGE"
}
```

### Step 2.1.4: Create FCMTokenManager

**File:** `/ios-app/Packages/BayitNotifications/Sources/BayitNotifications/Services/FCMTokenManager.swift`

```swift
import BayitCore
import BayitNetworking
import FirebaseMessaging
import Foundation

/// Manages FCM token registration and synchronization with backend.
public final class FCMTokenManager {

    private let logger = BayitLogger(category: "FCMTokenManager")
    private let apiClient: APIClient
    private let messaging = Messaging.messaging()

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    /// Get current FCM token.
    public func getCurrentToken() async throws -> String {
        return try await withCheckedThrowingContinuation { continuation in
            messaging.token { token, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else if let token = token {
                    continuation.resume(returning: token)
                } else {
                    continuation.resume(throwing: FCMError.noToken)
                }
            }
        }
    }

    /// Register FCM token with backend.
    public func registerToken() async throws {
        let token = try await getCurrentToken()

        logger.info("Registering FCM token", context: ["tokenPrefix": String(token.prefix(10))])

        let request = FCMTokenRequest(token: token, platform: "ios")
        let response: EmptyResponse = try await apiClient.post("/api/notifications/register-token", body: request)

        logger.info("FCM token registered successfully")
    }

    /// Unregister FCM token from backend (on logout).
    public func unregisterToken() async throws {
        guard let token = try? await getCurrentToken() else {
            logger.warning("No FCM token to unregister")
            return
        }

        logger.info("Unregistering FCM token")

        let request = FCMTokenRequest(token: token, platform: "ios")
        let response: EmptyResponse = try await apiClient.post("/api/notifications/unregister-token", body: request)

        logger.info("FCM token unregistered successfully")
    }

    /// Delete FCM token locally.
    public func deleteToken() async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            messaging.deleteToken { error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
        logger.info("FCM token deleted")
    }
}

// MARK: - Supporting Types

private struct FCMTokenRequest: Codable {
    let token: String
    let platform: String
}

private struct EmptyResponse: Codable {}

private enum FCMError: Error {
    case noToken
}
```

### Step 2.1.5: Create NotificationPermissionManager

**File:** `/ios-app/Packages/BayitNotifications/Sources/BayitNotifications/Services/NotificationPermissionManager.swift`

```swift
import BayitCore
import Foundation
import UserNotifications

/// Manages notification permissions and authorization.
public final class NotificationPermissionManager {

    private let logger = BayitLogger(category: "NotificationPermissionManager")

    /// Request notification permissions from user.
    public func requestPermissions() async throws -> Bool {
        let center = UNUserNotificationCenter.current()

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
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        logger.info("Notification permission status", context: ["status": "\(settings.authorizationStatus.rawValue)"])
        return settings.authorizationStatus
    }

    /// Register for remote notifications (APNs).
    @MainActor
    private func registerForRemoteNotifications() {
        UIApplication.shared.registerForRemoteNotifications()
        logger.info("Registered for remote notifications")
    }

    /// Open app settings for user to change permissions.
    @MainActor
    public func openAppSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}
```

### Step 2.1.6: Create PushNotificationService

**File:** `/ios-app/Packages/BayitNotifications/Sources/BayitNotifications/Services/PushNotificationService.swift`

```swift
import BayitCore
import BayitNetworking
import FirebaseMessaging
import Foundation
import UserNotifications

/// Main service for handling push notifications via Firebase Cloud Messaging.
public final class PushNotificationService: NSObject {

    private let logger = BayitLogger(category: "PushNotificationService")
    private let apiClient: APIClient
    private let tokenManager: FCMTokenManager
    private let permissionManager: NotificationPermissionManager

    /// Closure called when notification is received in foreground.
    public var onForegroundNotification: ((PushNotification) -> Void)?

    /// Closure called when user taps notification.
    public var onNotificationTapped: ((PushNotification) -> Void)?

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

    // MARK: - Setup

    /// Initialize push notifications (call on app launch).
    public func initialize() async throws {
        logger.info("Initializing push notifications")

        // Request permissions
        let granted = try await permissionManager.requestPermissions()

        if granted {
            // Register token with backend
            try await tokenManager.registerToken()

            // Subscribe to default topics
            try await subscribeToDefaultTopics()
        }
    }

    /// Handle APNs device token registration.
    public func didRegisterForRemoteNotifications(withDeviceToken deviceToken: Data) {
        logger.info("Registered for APNs", context: ["tokenLength": "\(deviceToken.count)"])

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
    private func subscribeToDefaultTopics() async throws {
        let defaultTopics: [NotificationTopic] = [.news, .newMovies, .newSeries]

        for topic in defaultTopics {
            try await subscribe(to: topic)
        }
    }

    // MARK: - Cleanup

    /// Clean up on logout.
    public func cleanup() async throws {
        logger.info("Cleaning up push notifications")

        // Unregister token from backend
        try await tokenManager.unregisterToken()

        // Delete FCM token
        try await tokenManager.deleteToken()
    }
}

// MARK: - MessagingDelegate

extension PushNotificationService: MessagingDelegate {

    /// Called when FCM token is refreshed.
    public func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }

        logger.info("FCM token refreshed", context: ["tokenPrefix": String(token.prefix(10))])

        // Register new token with backend
        Task {
            do {
                try await tokenManager.registerToken()
            } catch {
                logger.error("Failed to register refreshed FCM token", error: error)
            }
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

        // Show notification banner and play sound
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
            "action": response.actionIdentifier
        ])

        // Handle notification tap
        if response.actionIdentifier == UNNotificationDefaultActionIdentifier {
            // User tapped notification body
            onNotificationTapped?(pushNotification)
        }

        completionHandler()
    }
}
```

### Step 2.1.7: Update BayitPlusApp

**File:** `/ios-app/BayitPlusApp/App/BayitPlusApp.swift`

```swift
import BayitAuth
import BayitCore
import BayitLocalization
import BayitMedia
import BayitNetworking
import BayitNotifications  // ADD THIS
import BayitWidgetShared
import FirebaseCore
import FirebaseCrashlytics
import GoogleSignIn
import SwiftUI

@main
struct BayitPlusApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate  // ADD THIS

    @State private var coordinator = NavigationCoordinator()
    @State private var authManager: AuthManager
    @State private var localizationManager: LocalizationManager
    @State private var apiClient: APIClient
    @State private var repositories: RepositoryProvider
    @State private var mediaPlayer = MediaPlayer()
    @State private var widgetSyncService = WidgetDataSyncService()
    @State private var liveActivityManager = LiveActivityManager()
    @State private var mediaPlayerWidgetBridge: MediaPlayerWidgetBridge?
    @State private var pendingIntentHandler: PendingIntentHandler?
    @State private var locationProvider: AppLocationProvider
    @State private var featureFlags = FeatureFlags()
    @State private var pushNotificationService: PushNotificationService?  // ADD THIS

    init() {
        FirebaseApp.configure()
        Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)

        // ... existing initialization ...
    }

    private func initializePushNotifications() {
        if pushNotificationService == nil {
            let service = PushNotificationService(apiClient: apiClient)

            // Handle foreground notifications
            service.onForegroundNotification = { [weak self] notification in
                // Show in-app banner or handle silently
                self?.handleForegroundNotification(notification)
            }

            // Handle notification taps
            service.onNotificationTapped = { [weak self] notification in
                // Navigate to deep link
                if let deepLink = notification.deepLink,
                   let url = URL(string: deepLink) {
                    self?.coordinator.handleDeepLink(url)
                }
            }

            pushNotificationService = service

            // Initialize async
            Task {
                do {
                    try await service.initialize()
                } catch {
                    BayitLogger(category: "App").error("Failed to initialize push notifications", error: error)
                }
            }
        }
    }

    private func handleForegroundNotification(_ notification: PushNotification) {
        // Show in-app alert or toast
        // Implementation depends on UI design
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(coordinator)
                .environment(authManager)
                .environment(localizationManager)
                .environment(repositories)
                .environment(mediaPlayer)
                .environment(widgetSyncService)
                .environment(liveActivityManager)
                .environment(locationProvider)
                .environment(featureFlags)
                .task {
                    initializeWidgetBridge()
                    initializePushNotifications()  // ADD THIS

                    await pendingIntentHandler?.processPendingIntents()

                    if let bridge = mediaPlayerWidgetBridge {
                        // Inject bridge into environment if needed
                    }
                }
                .bayitLocalization(localizationManager)
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    if GIDSignIn.sharedInstance.handle(url) {
                        return
                    }
                    coordinator.handleDeepLink(url)
                }
                .task {
                    if UITestingSupport.isSkipAuth {
                        coordinator.showingAuth = false
                    } else {
                        coordinator.showingAuth = !authManager.isAuthenticated
                    }
                    if let testRoute = UITestingSupport.navigateToRoute,
                       let url = URL(string: "bayitplus://\(testRoute)") {
                        coordinator.handleDeepLink(url)
                    }
                    if let testLang = UITestingSupport.testLanguage,
                       let language = Language(rawValue: testLang) {
                        localizationManager.setLanguage(language)
                    }
                }
        }
    }
}

// MARK: - AppDelegate

class AppDelegate: NSObject, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Forward to PushNotificationService via notification
        NotificationCenter.default.post(
            name: .didRegisterForRemoteNotifications,
            object: nil,
            userInfo: ["deviceToken": deviceToken]
        )
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        BayitLogger(category: "AppDelegate").error("Failed to register for remote notifications", error: error)
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let didRegisterForRemoteNotifications = Notification.Name("didRegisterForRemoteNotifications")
}
```

### Step 2.1.8: Add Push Notification Capabilities

**File:** `/ios-app/BayitPlusApp/BayitPlusApp.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Existing entitlements -->
    <key>com.apple.developer.applesignin</key>
    <array>
        <string>Default</string>
    </array>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.tv.bayit.plus</string>
    </array>
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)tv.bayit.BayitPlus</string>
    </array>

    <!-- ADD THIS: Push Notifications -->
    <key>aps-environment</key>
    <string>development</string>  <!-- Change to 'production' for release -->
</dict>
</plist>
```

### Step 2.1.9: Update Info.plist Background Modes

**File:** `/ios-app/BayitPlusApp/Info.plist`

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>fetch</string>
    <string>remote-notification</string>  <!-- ADD THIS -->
</array>
```

### Step 2.1.10: Create Notification Settings View

**File:** `/ios-app/BayitPlusApp/Views/Settings/NotificationSettingsView.swift`

```swift
import BayitDesignSystem
import BayitNotifications
import SwiftUI

struct NotificationSettingsView: View {
    @Environment(\.pushNotificationService) private var pushService

    @State private var subscribedTopics: Set<NotificationTopic> = []
    @State private var isLoading = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Topic subscriptions
                ForEach(NotificationTopic.allCases, id: \.self) { topic in
                    GlassCard {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(topic.displayName)
                                    .font(.headline)
                                Text("Receive notifications for \(topic.displayName.lowercased())")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Toggle("", isOn: binding(for: topic))
                                .labelsHidden()
                        }
                        .padding()
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Notifications")
        .task {
            await loadSubscriptions()
        }
    }

    private func binding(for topic: NotificationTopic) -> Binding<Bool> {
        Binding(
            get: { subscribedTopics.contains(topic) },
            set: { isSubscribed in
                Task {
                    do {
                        if isSubscribed {
                            try await pushService?.subscribe(to: topic)
                            subscribedTopics.insert(topic)
                        } else {
                            try await pushService?.unsubscribe(from: topic)
                            subscribedTopics.remove(topic)
                        }
                    } catch {
                        // Handle error
                    }
                }
            }
        )
    }

    private func loadSubscriptions() async {
        // Load user's topic subscriptions from backend
        // For now, default to all topics
        subscribedTopics = Set(NotificationTopic.allCases)
    }
}
```

### Step 2.1.11: Testing Checklist

**FCM Testing:**
1. [ ] Build succeeds with FirebaseMessaging dependency
2. [ ] App requests notification permissions on first launch
3. [ ] FCM token generated and logged
4. [ ] FCM token registered with backend (verify via API logs)
5. [ ] Send test notification from Firebase Console
6. [ ] Foreground notification displays banner
7. [ ] Background notification wakes app
8. [ ] Notification tap opens deep link correctly
9. [ ] Topic subscription/unsubscription works
10. [ ] Token refresh handled correctly

**Test Notification Payload (Firebase Console):**

```json
{
  "notification": {
    "title": "New Movie Available",
    "body": "Check out the latest Israeli film!"
  },
  "data": {
    "type": "new_content",
    "deep_link": "bayitplus://movie/12345",
    "content_id": "12345",
    "content_type": "movie"
  }
}
```

### Deliverables:
- [x] BayitNotifications package created
- [x] FCM integration complete
- [x] Topic management implemented
- [x] Deep link handling from notifications
- [x] Notification settings UI
- [x] Testing completed

**Time Estimate:** 3 days (24 hours)

---

# PHASE 3: GOOGLE CAST SDK (Days 5-9 - 5 days)

## 3.1 Chromecast Implementation

### Why Chromecast?
- **User feature** - Cast to TV from mobile device
- **Competition** - Standard feature in streaming apps
- **Use case** - Watch Bayit+ on TV via Chromecast

### Architecture Overview

```
iOS App → Google Cast SDK → Chromecast Device
             ↓                      ↓
    MediaPlayer integration   Cast Receiver App
             ↓                      ↓
    Cast session lifecycle    Play HLS streams
```

### Step 3.1.1: Add Google Cast SDK Dependency

**Option A: Swift Package Manager (Preferred)**

**File:** `/ios-app/Package.swift`

```swift
dependencies: [
    .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "11.0.0"),
    .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "8.0.0"),
    .package(url: "https://github.com/warrenm/GLTFKit2.git", from: "0.5.0"),
    .package(url: "https://github.com/google/google-cast-sdk-ios.git", from: "4.8.0"),  // ADD THIS
],
```

**Option B: CocoaPods (If SPM unavailable)**

Create `/ios-app/Podfile`:

```ruby
platform :ios, '17.0'
use_frameworks!

target 'BayitPlusApp' do
  pod 'google-cast-sdk', '~> 4.8'
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
    end
  end
end
```

Then run: `cd ios-app && pod install`

### Step 3.1.2: Create BayitCast Package

**Directory Structure:**
```
Packages/BayitCast/
├── Sources/
│   └── BayitCast/
│       ├── Models/
│       │   ├── CastMedia.swift
│       │   └── CastSessionState.swift
│       ├── Services/
│       │   ├── CastService.swift
│       │   ├── CastSessionManager.swift
│       │   └── CastMediaController.swift
│       └── UI/
│           ├── CastButton.swift
│           └── CastMiniController.swift
└── Tests/
    └── BayitCastTests/
```

### Step 3.1.3: Create CastMedia Model

**File:** `/ios-app/Packages/BayitCast/Sources/BayitCast/Models/CastMedia.swift`

```swift
import Foundation

/// Represents media content for casting.
public struct CastMedia {
    /// Media stream URL
    public let streamUrl: String

    /// Media title
    public let title: String

    /// Media subtitle
    public let subtitle: String?

    /// Poster image URL
    public let posterUrl: String?

    /// Content type (e.g., "application/x-mpegURL" for HLS)
    public let contentType: String

    /// Media duration in seconds
    public let duration: TimeInterval?

    /// Custom data for receiver app
    public let customData: [String: Any]?

    public init(
        streamUrl: String,
        title: String,
        subtitle: String? = nil,
        posterUrl: String? = nil,
        contentType: String = "application/x-mpegURL",
        duration: TimeInterval? = nil,
        customData: [String: Any]? = nil
    ) {
        self.streamUrl = streamUrl
        self.title = title
        self.subtitle = subtitle
        self.posterUrl = posterUrl
        self.contentType = contentType
        self.duration = duration
        self.customData = customData
    }
}
```

**File:** `/ios-app/Packages/BayitCast/Sources/BayitCast/Models/CastSessionState.swift`

```swift
import Foundation

/// Cast session state.
public enum CastSessionState {
    case noDevicesAvailable
    case notConnected
    case connecting
    case connected
    case disconnected
}
```

### Step 3.1.4: Create CastService

**File:** `/ios-app/Packages/BayitCast/Sources/BayitCast/Services/CastService.swift`

```swift
import BayitCore
import Foundation
import GoogleCast

/// Main service for Google Cast integration.
public final class CastService: NSObject, ObservableObject {

    @Published public private(set) var sessionState: CastSessionState = .notConnected
    @Published public private(set) var isDeviceAvailable = false
    @Published public private(set) var currentDeviceName: String?

    private let logger = BayitLogger(category: "CastService")
    private let sessionManager: GCKSessionManager
    private let discoveryManager: GCKDiscoveryManager

    /// Receiver application ID (replace with your Cast receiver app ID)
    private static let receiverAppID = ProcessInfo.processInfo.environment["CHROMECAST_RECEIVER_APP_ID"] ?? GCKMediaDefaultReceiverApplicationID

    public override init() {
        self.sessionManager = GCKCastContext.sharedInstance().sessionManager
        self.discoveryManager = GCKCastContext.sharedInstance().discoveryManager

        super.init()

        // Add session manager listener
        sessionManager.add(self)

        // Start device discovery
        discoveryManager.add(self)
        discoveryManager.startDiscovery()

        // Configure Cast options
        configureCastOptions()
    }

    deinit {
        sessionManager.remove(self)
        discoveryManager.remove(self)
    }

    /// Initialize Cast SDK (call on app launch).
    public static func initialize() {
        let options = GCKCastOptions(receiverApplicationID: receiverAppID)
        options.physicalVolumeButtonsWillControlDeviceVolume = true

        GCKCastContext.setSharedInstanceWith(options)
        GCKLogger.sharedInstance().delegate = CastLogger()
    }

    private func configureCastOptions() {
        // Configure expanded media controls
        let criteria = GCKDiscoveryCriteria(applicationID: Self.receiverAppID)
        let options = GCKCastOptions(discoveryCriteria: criteria)
        options.physicalVolumeButtonsWillControlDeviceVolume = true
        options.suspendSessionsWhenBackgrounded = false
    }

    // MARK: - Session Management

    /// Present device picker.
    @MainActor
    public func presentDevicePicker() {
        GCKCastContext.sharedInstance().presentCastDialog()
    }

    /// Connect to current session (if available).
    public func connect() {
        if let session = sessionManager.currentCastSession {
            logger.info("Reconnecting to existing Cast session")
        } else {
            logger.warning("No Cast session available to connect")
        }
    }

    /// Disconnect from current session.
    public func disconnect() {
        sessionManager.endSessionAndStopCasting(true)
        logger.info("Disconnected from Cast session")
    }

    /// Load media to Cast device.
    public func loadMedia(_ media: CastMedia) throws {
        guard let session = sessionManager.currentCastSession else {
            logger.error("No active Cast session")
            throw CastError.noActiveSession
        }

        guard let remoteMediaClient = session.remoteMediaClient else {
            logger.error("No remote media client available")
            throw CastError.noMediaClient
        }

        // Build media information
        let metadata = GCKMediaMetadata(metadataType: .movie)
        metadata.setString(media.title, forKey: kGCKMetadataKeyTitle)

        if let subtitle = media.subtitle {
            metadata.setString(subtitle, forKey: kGCKMetadataKeySubtitle)
        }

        if let posterUrl = media.posterUrl, let url = URL(string: posterUrl) {
            metadata.addImage(GCKImage(url: url, width: 480, height: 720))
        }

        let mediaInfo = GCKMediaInformation(
            contentID: media.streamUrl,
            streamType: .buffered,
            contentType: media.contentType,
            metadata: metadata,
            streamDuration: media.duration ?? 0,
            mediaTracks: nil,
            textTrackStyle: nil,
            customData: media.customData
        )

        // Load media
        let request = remoteMediaClient.loadMedia(mediaInfo)
        request.delegate = self

        logger.info("Loading media to Cast device", context: [
            "title": media.title,
            "streamUrl": media.streamUrl
        ])
    }

    /// Get current playback position.
    public var currentPosition: TimeInterval? {
        guard let session = sessionManager.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else {
            return nil
        }
        return remoteMediaClient.approximateStreamPosition()
    }

    /// Get media status.
    public var isPlaying: Bool {
        guard let session = sessionManager.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else {
            return false
        }
        return remoteMediaClient.mediaStatus?.playerState == .playing
    }
}

// MARK: - GCKSessionManagerListener

extension CastService: GCKSessionManagerListener {

    public func sessionManager(_ sessionManager: GCKSessionManager, didStart session: GCKSession) {
        logger.info("Cast session started", context: ["deviceName": session.device.friendlyName ?? "Unknown"])

        Task { @MainActor in
            sessionState = .connected
            currentDeviceName = session.device.friendlyName
        }
    }

    public func sessionManager(_ sessionManager: GCKSessionManager, didEnd session: GCKSession, withError error: Error?) {
        if let error = error {
            logger.error("Cast session ended with error", error: error)
        } else {
            logger.info("Cast session ended")
        }

        Task { @MainActor in
            sessionState = .disconnected
            currentDeviceName = nil
        }
    }

    public func sessionManager(_ sessionManager: GCKSessionManager, didFailToStart session: GCKSession, withError error: Error) {
        logger.error("Failed to start Cast session", error: error)

        Task { @MainActor in
            sessionState = .notConnected
        }
    }

    public func sessionManager(_ sessionManager: GCKSessionManager, didResumeCastSession session: GCKSession) {
        logger.info("Resumed Cast session")

        Task { @MainActor in
            sessionState = .connected
            currentDeviceName = session.device.friendlyName
        }
    }
}

// MARK: - GCKDiscoveryManagerListener

extension CastService: GCKDiscoveryManagerListener {

    public func didStartDiscovery(forDeviceCategory deviceCategory: String) {
        logger.info("Started device discovery", context: ["category": deviceCategory])
    }

    public func didUpdate(_ deviceCount: UInt, forDeviceCategory deviceCategory: String) {
        logger.info("Device count updated", context: ["count": "\(deviceCount)", "category": deviceCategory])

        Task { @MainActor in
            isDeviceAvailable = deviceCount > 0
            if deviceCount == 0 {
                sessionState = .noDevicesAvailable
            } else if sessionState == .noDevicesAvailable {
                sessionState = .notConnected
            }
        }
    }
}

// MARK: - GCKRequestDelegate

extension CastService: GCKRequestDelegate {

    public func requestDidComplete(_ request: GCKRequest) {
        logger.info("Cast request completed", context: ["requestID": "\(request.requestID)"])
    }

    public func request(_ request: GCKRequest, didFailWithError error: GCKError) {
        logger.error("Cast request failed", error: error, context: ["requestID": "\(request.requestID)"])
    }
}

// MARK: - Supporting Types

private enum CastError: Error {
    case noActiveSession
    case noMediaClient
}

/// Cast logger that forwards to BayitLogger.
private class CastLogger: NSObject, GCKLoggerDelegate {
    private let logger = BayitLogger(category: "GoogleCast")

    func logMessage(_ message: String, at level: GCKLoggerLevel, fromFunction function: String, location: String) {
        switch level {
        case .error:
            logger.error(message, context: ["function": function])
        case .warning:
            logger.warning(message, context: ["function": function])
        case .info, .debug, .verbose:
            logger.info(message, context: ["function": function])
        @unknown default:
            logger.info(message, context: ["function": function])
        }
    }
}
```

### Step 3.1.5: Create Cast Button

**File:** `/ios-app/Packages/BayitCast/Sources/BayitCast/UI/CastButton.swift`

```swift
import GoogleCast
import SwiftUI
import UIKit

/// SwiftUI wrapper for Google Cast button.
public struct CastButton: UIViewRepresentable {

    public init() {}

    public func makeUIView(context: Context) -> GCKUICastButton {
        let button = GCKUICastButton(frame: CGRect(x: 0, y: 0, width: 24, height: 24))
        button.tintColor = .white
        return button
    }

    public func updateUIView(_ uiView: GCKUICastButton, context: Context) {
        // No updates needed
    }
}
```

### Step 3.1.6: Integrate with MediaPlayer

**File:** `/ios-app/Packages/BayitMedia/Sources/BayitMedia/MediaPlayer.swift`

**Add Cast integration:**

```swift
import AVFoundation
import BayitCore
import BayitCast  // ADD THIS
import Combine
import Foundation

@Observable
public final class MediaPlayer {
    // ... existing properties ...

    private var castService: CastService?  // ADD THIS

    public init() {
        // ... existing init ...
    }

    /// Set Cast service for casting support.
    public func setCastService(_ service: CastService) {
        self.castService = service
    }

    /// Load media for playback (local or cast).
    public func loadMedia(url: URL, title: String, subtitle: String? = nil, posterUrl: String? = nil) {
        // Check if casting
        if let castService = castService, castService.sessionState == .connected {
            // Cast to Chromecast
            let media = CastMedia(
                streamUrl: url.absoluteString,
                title: title,
                subtitle: subtitle,
                posterUrl: posterUrl,
                duration: nil
            )

            do {
                try castService.loadMedia(media)
                logger.info("Media loaded to Cast device")
            } catch {
                logger.error("Failed to load media to Cast", error: error)
                // Fallback to local playback
                loadMediaLocally(url: url)
            }
        } else {
            // Local playback
            loadMediaLocally(url: url)
        }
    }

    private func loadMediaLocally(url: URL) {
        let playerItem = AVPlayerItem(url: url)
        player.replaceCurrentItem(with: playerItem)
        logger.info("Media loaded for local playback")
    }

    // ... rest of MediaPlayer ...
}
```

### Step 3.1.7: Add Cast Button to Player UI

**File:** `/ios-app/BayitPlusApp/Views/Player/MediaPlayerView.swift`

```swift
import BayitCast
import BayitDesignSystem
import BayitMedia
import SwiftUI

struct MediaPlayerView: View {
    @Environment(\.castService) private var castService
    @Environment(\.mediaPlayer) private var mediaPlayer

    var body: some View {
        ZStack {
            // Video player view
            VideoPlayerView()

            VStack {
                HStack {
                    Spacer()

                    // Cast button
                    if let castService = castService {
                        CastButton()
                            .frame(width: 44, height: 44)
                            .padding()
                    }
                }

                Spacer()

                // Player controls
                PlayerControlsView()
            }
        }
    }
}
```

### Step 3.1.8: Initialize Cast SDK

**File:** `/ios-app/BayitPlusApp/App/BayitPlusApp.swift`

```swift
import BayitCast  // ADD THIS

@main
struct BayitPlusApp: App {
    // ... existing properties ...

    @State private var castService: CastService?  // ADD THIS

    init() {
        FirebaseApp.configure()
        Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)

        // Initialize Cast SDK
        CastService.initialize()  // ADD THIS

        // ... rest of init ...
    }

    private func initializeCastService() {
        if castService == nil {
            let service = CastService()
            castService = service

            // Inject into MediaPlayer
            mediaPlayer.setCastService(service)
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(coordinator)
                .environment(authManager)
                .environment(localizationManager)
                .environment(repositories)
                .environment(mediaPlayer)
                .environment(castService)  // ADD THIS
                .environment(widgetSyncService)
                .environment(liveActivityManager)
                .environment(locationProvider)
                .environment(featureFlags)
                .task {
                    initializeWidgetBridge()
                    initializePushNotifications()
                    initializeCastService()  // ADD THIS

                    // ... rest of task ...
                }
                // ... rest of body ...
        }
    }
}
```

### Step 3.1.9: Configure Cast Receiver App

**Option A: Use Default Receiver**
- Use `GCKMediaDefaultReceiverApplicationID` (already configured)
- No custom receiver app needed
- Supports basic HLS playback

**Option B: Custom Receiver App** (Recommended for full control)

1. Create Cast receiver app at: https://cast.google.com/publish/
2. Host receiver app HTML at: `https://bayit.tv/cast-receiver/`
3. Update environment variable: `CHROMECAST_RECEIVER_APP_ID=YOUR_APP_ID`

**Receiver App HTML** (minimal example):

```html
<!DOCTYPE html>
<html>
<head>
  <title>Bayit+ Cast Receiver</title>
  <script src="//www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js"></script>
</head>
<body>
  <cast-media-player></cast-media-player>
  <script>
    const context = cast.framework.CastReceiverContext.getInstance();
    const playerManager = context.getPlayerManager();

    // Customize player appearance
    const playbackConfig = new cast.framework.PlaybackConfig();
    playbackConfig.autoResumeDuration = 5;
    playerManager.setPlaybackConfig(playbackConfig);

    // Start receiver
    context.start();
  </script>
</body>
</html>
```

### Step 3.1.10: Testing Checklist

**Cast Testing:**
1. [ ] Build succeeds with Google Cast SDK
2. [ ] App initializes Cast SDK without errors
3. [ ] Cast button appears in player UI
4. [ ] Tap Cast button shows device picker
5. [ ] Chromecast device discovered
6. [ ] Successfully connect to Chromecast
7. [ ] Load media to Chromecast
8. [ ] Video plays on Chromecast device
9. [ ] Play/pause controls work
10. [ ] Seek/scrub works
11. [ ] Volume control works
12. [ ] Disconnect from Cast session
13. [ ] Session survives app backgrounding
14. [ ] Multiple users can cast sequentially

**Test Devices:**
- Chromecast (all generations)
- Google TV / Android TV with Cast support
- Smart TVs with built-in Chromecast

### Step 3.1.11: Environment Configuration

**File:** Update Google Cloud Secret Manager

```bash
# Add Chromecast receiver app ID
CHROMECAST_RECEIVER_APP_ID=CC1AD845  # Replace with your app ID
```

### Deliverables:
- [x] Google Cast SDK integrated
- [x] BayitCast package created
- [x] Cast button in player UI
- [x] Media casting functionality
- [x] Session management
- [x] Testing completed
- [x] Cast receiver app configured

**Time Estimate:** 5 days (40 hours)

---

# PHASE 4: TESTING & VALIDATION (Days 10-12 - 3 days)

## 4.1 Comprehensive Testing

### End-to-End Testing Scenarios

**Scenario 1: First Launch Experience**
1. Fresh install
2. Request notification permissions
3. Register FCM token
4. Subscribe to default topics
5. Initialize Cast SDK
6. Verify all services initialized

**Scenario 2: Push Notification Flow**
1. Send test notification from Firebase Console
2. Verify foreground display
3. Tap notification
4. Verify deep link navigation
5. Verify analytics event logged

**Scenario 3: Casting Flow**
1. Start playing video locally
2. Tap Cast button
3. Select Chromecast device
4. Verify video transfers to Cast
5. Control playback via phone
6. Disconnect from Cast
7. Verify playback returns to phone

**Scenario 4: Error Tracking**
1. Force test crash
2. Verify crash logged to Crashlytics
3. Check Firebase Console for crash report
4. Verify user context included
5. Verify custom keys attached

**Scenario 5: Topic Management**
1. Open notification settings
2. Subscribe to new topic
3. Verify subscription API call
4. Send topic notification
5. Verify notification received
6. Unsubscribe from topic
7. Verify no notifications for that topic

### Performance Testing

**Metrics to Monitor:**
- App launch time (should not increase >100ms)
- Memory usage (FCM + Cast should use <10MB additional)
- Battery drain (push notifications in background)
- Network usage (Cast discovery)

### Regression Testing

**Critical Paths:**
- [ ] Authentication still works
- [ ] Video playback unaffected
- [ ] Audio playback unaffected
- [ ] Widgets still function
- [ ] Deep linking still works
- [ ] Voice features unaffected
- [ ] All existing features operational

### Device Testing Matrix

| Device | iOS Version | Test FCM | Test Cast | Test Crashlytics |
|--------|-------------|----------|-----------|------------------|
| iPhone 15 Pro | iOS 17.0 | ✓ | ✓ | ✓ |
| iPhone 14 | iOS 17.2 | ✓ | ✓ | ✓ |
| iPhone 13 | iOS 17.4 | ✓ | ✓ | ✓ |
| iPad Pro | iPadOS 17 | ✓ | ✓ | ✓ |
| iPhone 12 | iOS 17.0 | ✓ | ✓ | ✓ |

### Deliverables:
- [x] All E2E scenarios pass
- [x] Performance metrics within acceptable range
- [x] No regressions detected
- [x] All device matrix tested
- [x] Test report generated

**Time Estimate:** 3 days (24 hours)

---

# PHASE 5: DOCUMENTATION & DEPLOYMENT (Days 13-15 - 3 days)

## 5.1 Documentation Updates

### User-Facing Documentation

**File:** `/docs/features/PUSH_NOTIFICATIONS.md`

```markdown
# Push Notifications

Bayit+ uses Firebase Cloud Messaging (FCM) to deliver timely notifications about new content, live events, and personalized recommendations.

## Features

- **Topic Subscriptions** - Subscribe to specific content categories
- **Personalized Notifications** - Based on your viewing history
- **Deep Links** - Tap to jump directly to content
- **Rich Media** - Images and videos in notifications

## Managing Notifications

1. Open **Settings** → **Notifications**
2. Toggle topics on/off
3. Adjust notification frequency
4. Manage quiet hours

## Troubleshooting

- **Not receiving notifications?** Check iOS Settings → Notifications → Bayit+
- **Too many notifications?** Unsubscribe from topics in app settings
- **Deep links not working?** Update to latest app version
```

**File:** `/docs/features/CHROMECAST.md`

```markdown
# Chromecast Support

Cast Bayit+ content from your iPhone/iPad to any Chromecast-enabled device.

## Supported Devices

- Chromecast (all generations)
- Google TV / Android TV
- Smart TVs with built-in Chromecast

## How to Cast

1. Ensure iPhone and Chromecast are on same Wi-Fi network
2. Start playing content
3. Tap the Cast button (top-right corner)
4. Select your Chromecast device
5. Control playback from your phone

## Features

- Continue watching where you left off
- Full playback controls from phone
- Picture-in-picture on phone while casting
- Background casting (close app, casting continues)

## Troubleshooting

- **Cast button not showing?** Check Wi-Fi connection
- **Device not found?** Restart Chromecast and app
- **Buffering issues?** Check internet speed (recommend 25 Mbps+)
```

### Developer Documentation

**File:** `/docs/architecture/PUSH_NOTIFICATIONS_ARCHITECTURE.md`

Document the FCM architecture, including:
- Service initialization flow
- Token management lifecycle
- Topic subscription system
- Notification payload structure
- Deep link routing
- Error handling

**File:** `/docs/architecture/CHROMECAST_ARCHITECTURE.md`

Document the Cast architecture, including:
- SDK initialization
- Session lifecycle
- Media loading flow
- Receiver app configuration
- Error handling

## 5.2 Deployment Checklist

### Pre-Deployment

**Code Review:**
- [ ] All code reviewed by senior engineer
- [ ] Security review completed
- [ ] Performance profiling completed
- [ ] No hardcoded values (all in env vars)

**Testing:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual QA completed
- [ ] TestFlight beta tested

**Configuration:**
- [ ] Firebase Console configured
- [ ] FCM server key added to backend
- [ ] Cast receiver app deployed
- [ ] Environment variables set
- [ ] APNs certificates configured

### Deployment Steps

**1. TestFlight Beta (Week 13)**
```bash
# Build for TestFlight
xcodebuild -scheme BayitPlusApp \
  -configuration Release \
  -archivePath ./build/BayitPlus.xcarchive \
  archive

# Upload to TestFlight
xcodebuild -exportArchive \
  -archivePath ./build/BayitPlus.xcarchive \
  -exportPath ./build \
  -exportOptionsPlist ExportOptions.plist

# Submit via fastlane
fastlane ios beta
```

**2. Internal Testing (Week 14)**
- Invite 50 internal beta testers
- Monitor crash reports daily
- Collect feedback via TestFlight
- Fix critical issues

**3. Public Beta (Week 14-15)**
- Invite 500 public beta testers
- Monitor analytics and crashes
- Address major issues
- Prepare release notes

**4. Production Release (Week 15)**
- Submit to App Store Review
- Prepare release notes
- Schedule release date
- Monitor rollout

### Post-Deployment

**Monitoring:**
- [ ] Crashlytics dashboard monitored
- [ ] FCM delivery rates tracked
- [ ] Cast session analytics reviewed
- [ ] User feedback reviewed

**Rollback Plan:**
- If crash rate >1%: Pull release, fix, resubmit
- If FCM not working: Disable notifications backend-side
- If Cast broken: Hide Cast button via feature flag

### Deliverables:
- [x] User documentation complete
- [x] Developer documentation complete
- [x] TestFlight build deployed
- [x] Internal testing completed
- [x] Production release submitted

**Time Estimate:** 3 days (24 hours)

---

# IMPLEMENTATION TIMELINE

## Week 1: Error Tracking & FCM

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| Day 1 AM | Add Firebase Crashlytics | Backend Dev | Not Started |
| Day 1 PM | Test Crashlytics integration | QA | Not Started |
| Day 2 | Create BayitNotifications package | iOS Dev | Not Started |
| Day 3 | Implement FCM integration | iOS Dev | Not Started |
| Day 4 | Create notification settings UI | iOS Dev | Not Started |

## Week 2: Chromecast

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| Day 5 | Add Google Cast SDK | iOS Dev | Not Started |
| Day 6 | Create BayitCast package | iOS Dev | Not Started |
| Day 7 | Implement Cast session management | iOS Dev | Not Started |
| Day 8 | Integrate Cast with MediaPlayer | iOS Dev | Not Started |
| Day 9 | Add Cast UI components | iOS Dev | Not Started |

## Week 3: Testing & Deployment

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| Day 10 | End-to-end testing | QA | Not Started |
| Day 11 | Regression testing | QA | Not Started |
| Day 12 | Performance testing | QA | Not Started |
| Day 13 | TestFlight deployment | DevOps | Not Started |
| Day 14 | Internal testing | Team | Not Started |
| Day 15 | Production release prep | PM | Not Started |

---

# ACCEPTANCE CRITERIA

## Firebase Crashlytics

- [x] Crashlytics dependency added
- [x] Crashes automatically reported
- [x] User context attached to crashes
- [x] Custom events logged
- [x] Error grouping works in Firebase Console
- [x] No performance degradation

## Firebase Cloud Messaging

- [x] FCM token registered with backend
- [x] Push notifications delivered reliably
- [x] Topic subscriptions work
- [x] Foreground notifications display correctly
- [x] Background notifications wake app
- [x] Deep links work from notifications
- [x] Notification settings UI functional
- [x] Token refresh handled automatically

## Google Cast

- [x] Cast button appears in player
- [x] Chromecast devices discovered
- [x] Cast session connects reliably
- [x] Media loads and plays on Cast device
- [x] Playback controls work from phone
- [x] Session survives app backgrounding
- [x] Disconnect works cleanly
- [x] No memory leaks

---

# RISK MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| APNs certificate issues | High | Low | Test APNs in dev environment first |
| FCM delivery delays | Medium | Medium | Set realistic user expectations, monitor delivery rates |
| Cast SDK crashes | High | Low | Comprehensive error handling, fallback to local playback |
| App size increase | Low | High | Optimize assets, use dynamic frameworks |
| Battery drain from FCM | Medium | Low | Optimize topic subscriptions, batch notifications |
| Network issues during Cast | Medium | Medium | Show user-friendly error, automatic retry |

---

# SUCCESS METRICS

## Crashlytics

- **Crash-free rate:** >99.5%
- **Time to detection:** <5 minutes for 90% of crashes
- **Error grouping accuracy:** >95%

## Push Notifications

- **Delivery rate:** >95% within 5 minutes
- **Tap-through rate:** >10%
- **Opt-in rate:** >60%
- **Unsubscribe rate:** <5%

## Chromecast

- **Connection success rate:** >95%
- **Session stability:** <1% unexpected disconnects
- **Adoption rate:** >20% of active users
- **Average session duration:** >30 minutes

---

# RESOURCES

## Firebase Console
- Project: `bayit-plus`
- Console: https://console.firebase.google.com/

## Google Cast Console
- Developer Console: https://cast.google.com/publish/

## Documentation
- FCM iOS Guide: https://firebase.google.com/docs/cloud-messaging/ios/client
- Google Cast iOS Guide: https://developers.google.com/cast/docs/ios_sender
- Crashlytics iOS Guide: https://firebase.google.com/docs/crashlytics/get-started?platform=ios

## Support Contacts
- Firebase Support: firebase-support@google.com
- Cast Developer Support: https://developers.google.com/cast/support

---

**Document Status:** Ready for Implementation
**Estimated Completion:** 15 working days (3 weeks)
**Total Engineering Hours:** ~112 hours
