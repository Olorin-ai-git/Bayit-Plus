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
    @State private var mediaPlayer: MediaPlayer
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
    @State private var audioPlaybackManager: AudioPlaybackManager

    init() {
        if FirebaseApp.app() == nil {
            if let options = FirebaseOptions.defaultOptions(),
               options.googleAppID != "placeholder" {
                FirebaseApp.configure()
                CrashlyticsLogger.initialize()
            }
        }

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

        let repos = RepositoryProvider(
            client: client,
            webSocketManager: wsManager,
            authTokenProvider: authMgr.authTokenProvider,
            configuration: appConfig
        )

        let mp = MediaPlayer()

        let resolver = StreamResolver(
            mediaRepository: repos.media,
            contentRepository: repos.content,
            liveTVRepository: repos.liveTV,
            radioRepository: repos.radio,
            podcastRepository: repos.podcasts
        )

        _authManager = State(initialValue: authMgr)
        _localizationManager = State(initialValue: LocalizationManager())
        _apiClient = State(initialValue: client)
        _repositories = State(initialValue: repos)
        _mediaPlayer = State(initialValue: mp)
        _locationProvider = State(initialValue: locProvider)
        _audioPlaybackManager = State(initialValue: AudioPlaybackManager(
            mediaPlayer: mp,
            streamResolver: resolver
        ))
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
        if authManager.isAuthenticated, let userId = authManager.user?.id {
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
            let nav = coordinator
            let appLogger = BayitLogger(category: "App")

            // Handle foreground notifications
            service.onForegroundNotification = { notification in
                appLogger.info("Foreground notification received", context: [
                    "type": notification.type.rawValue,
                    "title": notification.title
                ])
            }

            // Handle notification taps
            service.onNotificationTapped = { notification in
                Task { @MainActor [weak nav] in
                    if let deepLink = notification.deepLink,
                       let url = URL(string: deepLink) {
                        nav?.handleDeepLink(url)
                    }
                }
            }

            // Handle notification actions
            service.onNotificationAction = { notification, action in
                Task { @MainActor [weak nav] in
                    appLogger.info("Notification action performed", context: [
                        "action": action.rawValue,
                        "notificationType": notification.type.rawValue
                    ])
                    if [.play, .view, .join].contains(action),
                       let deepLink = notification.deepLink,
                       let url = URL(string: deepLink) {
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
                .environment(castSessionManager)
                .environment(audioPlaybackManager)
                .task {
                    initializeWidgetBridge()
                    initializeCrashlyticsContext()
                    initializePushNotifications()
                    initializeCastSystem()

                    // Process pending intents from widgets
                    await pendingIntentHandler?.processPendingIntents()

                    // Sync auth token for widgets on launch (covers session restore)
                    let helper = SharedKeychainHelper()
                    if let token = authManager.token {
                        helper.writeAuthToken(token)
                        WidgetCenter.shared.reloadAllTimelines()
                    }
                }
                .onChange(of: authManager.token) { _, newToken in
                    let helper = SharedKeychainHelper()
                    if let token = newToken {
                        helper.writeAuthToken(token)
                    } else {
                        helper.deleteAuthToken()
                    }
                    WidgetCenter.shared.reloadAllTimelines()
                }
                .bayitLocalization(localizationManager)
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    BayitLogger(category: "DeepLink").info("Received deep link: \(url.absoluteString)")
                    if GIDSignIn.sharedInstance.handle(url) {
                        BayitLogger(category: "DeepLink").info("Handled by Google Sign-In")
                        return
                    }
                    BayitLogger(category: "DeepLink").info("Calling handleDeepLink")
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
