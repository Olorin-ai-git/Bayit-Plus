import BayitAnalytics
import BayitAuth
import BayitCast
import BayitCore
import BayitLocalization
import BayitMedia
import BayitNetworking
import BayitNotifications
import BayitWidgetShared
import FirebaseCore
import GoogleSignIn
import SwiftUI

@main
struct BayitPlusApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

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
    @State private var crashlyticsService = CrashlyticsService()
    @State private var pushNotificationService: PushNotificationService?
    @State private var castSessionManager = CastSessionManager()
    @State private var mediaPlayerCastBridge: MediaPlayerCastBridge?

    init() {
        FirebaseApp.configure()

        // Initialize Crashlytics
        CrashlyticsLogger.initialize()

        let appConfig = AppConfiguration()
        let apiLogger = AppAPILogger()

        let networkConfig = AppNetworkConfiguration(appConfig: appConfig)
        let authConfig = AppAuthConfiguration()

        let authMgr = AuthManager(
            configuration: authConfig,
            logger: apiLogger
        )

        let locProvider = AppLocationProvider()

        let client = APIClient(
            configuration: networkConfig,
            authTokenProvider: authMgr.authTokenProvider,
            locationProvider: locProvider,
            logger: apiLogger
        )

        let wsManager = WebSocketManager(configuration: networkConfig, logger: apiLogger)

        _authManager = State(initialValue: authMgr)
        _localizationManager = State(initialValue: LocalizationManager())
        _apiClient = State(initialValue: client)
        _repositories = State(initialValue: RepositoryProvider(
            client: client,
            webSocketManager: wsManager,
            authTokenProvider: authMgr.authTokenProvider,
            configuration: appConfig
        ))
        _locationProvider = State(initialValue: locProvider)
    }

    /// Initialize the media player widget bridge after app launch.
    private func initializeWidgetBridge() {
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
    private func initializeCrashlyticsContext() {
        if authManager.isAuthenticated, let userId = authManager.currentUser?.id {
            crashlyticsService.setUserID(userId)
        }

        // Set app version context
        if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
           let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String {
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
    private func initializePushNotifications() {
        if pushNotificationService == nil {
            let service = PushNotificationService(apiClient: apiClient)

            // Handle foreground notifications
            service.onForegroundNotification = { [weak self] notification in
                self?.handleForegroundNotification(notification)
            }

            // Handle notification taps
            service.onNotificationTapped = { [weak self] notification in
                self?.handleNotificationTap(notification)
            }

            // Handle notification actions
            service.onNotificationAction = { [weak self] notification, action in
                self?.handleNotificationAction(notification, action: action)
            }

            pushNotificationService = service

            // Store reference for AppDelegate
            AppDelegate.pushNotificationService = service

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

    /// Handle notification received in foreground.
    private func handleForegroundNotification(_ notification: PushNotification) {
        // Show in-app banner or handle silently based on notification type
        // For now, just log
        BayitLogger(category: "App").info("Foreground notification received", context: [
            "type": notification.type.rawValue,
            "title": notification.title
        ])
    }

    /// Handle notification tap.
    private func handleNotificationTap(_ notification: PushNotification) {
        // Navigate to deep link
        if let deepLink = notification.deepLink,
           let url = URL(string: deepLink) {
            coordinator.handleDeepLink(url)
        }
    }

    /// Handle notification action.
    private func handleNotificationAction(_ notification: PushNotification, action: NotificationAction) {
        BayitLogger(category: "App").info("Notification action performed", context: [
            "action": action.rawValue,
            "notificationType": notification.type.rawValue
        ])

        // Handle specific actions
        switch action {
        case .play:
            if let deepLink = notification.deepLink, let url = URL(string: deepLink) {
                coordinator.handleDeepLink(url)
            }
        case .view:
            if let deepLink = notification.deepLink, let url = URL(string: deepLink) {
                coordinator.handleDeepLink(url)
            }
        case .join:
            if let deepLink = notification.deepLink, let url = URL(string: deepLink) {
                coordinator.handleDeepLink(url)
            }
        default:
            break
        }
    }

    /// Initialize cast session manager and bridge.
    private func initializeCastSystem() {
        if mediaPlayerCastBridge == nil {
            mediaPlayerCastBridge = MediaPlayerCastBridge(
                mediaPlayer: mediaPlayer,
                castManager: castSessionManager
            )
        }

        Task {
            do {
                #if os(iOS)
                let receiverAppId = "YOUR_GOOGLE_CAST_RECEIVER_APP_ID"
                try await castSessionManager.initialize(receiverAppId: receiverAppId)
                BayitLogger(category: "App").info("Cast system initialized successfully")
                #endif
            } catch {
                BayitLogger(category: "App").error("Failed to initialize cast system", error: error)
            }
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
                .environment(widgetSyncService)
                .environment(liveActivityManager)
                .environment(locationProvider)
                .environment(featureFlags)
                .environment(crashlyticsService)
                .environment(pushNotificationService)
                .environment(castSessionManager)
                .task {
                    initializeWidgetBridge()
                    initializeCrashlyticsContext()
                    initializePushNotifications()
                    initializeCastSystem()

                    // Process pending intents from widgets
                    await pendingIntentHandler?.processPendingIntents()

                    if let bridge = mediaPlayerWidgetBridge {
                        // Inject bridge into environment if needed
                        // await bridge.syncNow(...) will be called by ViewModels
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

    static var pushNotificationService: PushNotificationService?

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
        // Forward to push notification service
        Task { @MainActor in
            AppDelegate.pushNotificationService?.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        // Forward to push notification service
        Task { @MainActor in
            AppDelegate.pushNotificationService?.didFailToRegisterForRemoteNotifications(withError: error)
        }
    }
}
