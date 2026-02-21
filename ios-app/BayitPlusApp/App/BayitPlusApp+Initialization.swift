import BayitCast
import BayitCore
import BayitNotifications
import Foundation
import SwiftUI

// MARK: - BayitPlusApp Initialization Helpers

extension BayitPlusApp {
    /// Initialize the media player widget bridge after app launch.
    func initializeWidgetBridge() {
        if mediaPlayerWidgetBridge == nil {
            mediaPlayerWidgetBridge = MediaPlayerWidgetBridge(
                mediaPlayer: mediaPlayer,
                widgetSync: widgetSyncService
            )
        }
        if pendingIntentHandler == nil {
            pendingIntentHandler = PendingIntentHandler(mediaPlayer: mediaPlayer)
        }
    }

    /// Initialize Crashlytics user context.
    func initializeCrashlyticsContext() {
        if authManager.isAuthenticated, let userId = authManager.user?.id {
            crashlyticsService.setUserID(userId)
        }

        // Set app version context
        if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
           let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String
        {
            crashlyticsService.setCustomValue("\(version) (\(build))", forKey: "app_version")
        }

        // Set platform
        #if os(iOS)
            crashlyticsService.setCustomValue("iOS", forKey: "platform")
        #elseif os(tvOS)
            crashlyticsService.setCustomValue("tvOS", forKey: "platform")
        #endif
    }

    /// Initialize push notifications.
    func initializePushNotifications() {
        if pushNotificationService == nil {
            let service = PushNotificationService(apiClient: apiClient)
            let nav = coordinator
            let appLogger = BayitLogger(category: "App")

            // Handle foreground notifications
            service.onForegroundNotification = { notification in
                appLogger.info("Foreground notification received", context: [
                    "type": notification.type.rawValue,
                    "title": notification.title,
                ])
            }

            // Handle notification taps
            service.onNotificationTapped = { notification in
                Task { @MainActor [weak nav] in
                    if let deepLink = notification.deepLink,
                       let url = URL(string: deepLink)
                    {
                        nav?.handleDeepLink(url)
                    }
                }
            }

            // Handle notification actions
            service.onNotificationAction = { notification, action in
                Task { @MainActor [weak nav] in
                    appLogger.info("Notification action performed", context: [
                        "action": action.rawValue,
                        "notificationType": notification.type.rawValue,
                    ])
                    if [.play, .view, .join].contains(action),
                       let deepLink = notification.deepLink,
                       let url = URL(string: deepLink)
                    {
                        nav?.handleDeepLink(url)
                    }
                }
            }

            pushNotificationService = service

            // Store reference for AppDelegate
            AppDelegate.pushNotificationService = service

            // Initialize async
            Task {
                do {
                    try await service.initialize()
                } catch {
                    appLogger.error("Failed to initialize push notifications", error: error)
                }
            }
        }
    }

    /// Initialize cast session manager and bridge.
    func initializeCastSystem() {
        if mediaPlayerCastBridge == nil {
            mediaPlayerCastBridge = MediaPlayerCastBridge(
                mediaPlayer: mediaPlayer,
                castManager: castSessionManager
            )
        }

        Task {
            do {
                #if os(iOS)
                    let appConfig = AppConfiguration()
                    let receiverAppId = appConfig.googleCastReceiverAppId
                    guard !receiverAppId.isEmpty else {
                        BayitLogger(category: "App").warning("Google Cast receiver app ID not configured, skipping cast initialization")
                        return
                    }
                    try await castSessionManager.initialize(receiverAppId: receiverAppId)
                    BayitLogger(category: "App").info("Cast system initialized successfully")
                #endif
            } catch {
                BayitLogger(category: "App").error("Failed to initialize cast system", error: error)
            }
        }
    }
}
