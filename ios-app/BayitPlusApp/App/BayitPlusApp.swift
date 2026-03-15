import BayitAnalytics
import BayitAuth
import BayitBYOC
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
import WidgetKit

@main
struct BayitPlusApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    @State var coordinator = NavigationCoordinator()
    @State var authManager: AuthManager
    @State var localizationManager: LocalizationManager
    @State var apiClient: APIClient
    @State var repositories: RepositoryProvider
    @State var mediaPlayer: MediaPlayer
    @State var widgetSyncService = WidgetDataSyncService()
    @State var liveActivityManager = LiveActivityManager()
    @State var mediaPlayerWidgetBridge: MediaPlayerWidgetBridge?
    @State var pendingIntentHandler: PendingIntentHandler?
    @State var locationProvider: AppLocationProvider
    @State var featureFlags = FeatureFlags()
    @State var uiPreferences = UserUIPreferencesStore()
    @State var crashlyticsService = CrashlyticsService()
    @State var pushNotificationService: PushNotificationService?
    @State var castSessionManager = CastSessionManager()
    @State var mediaPlayerCastBridge: MediaPlayerCastBridge?
    @State var audioPlaybackManager: AudioPlaybackManager
    @State var downloadManager: DownloadManager
    @State var byocManager = BYOCSourceManager()
    @State var networkMonitor = NetworkMonitor()
    @State var tooltipManager = TooltipManager(userId: "anonymous")

    init() {
        if FirebaseApp.app() == nil {
            if let options = FirebaseOptions.defaultOptions(),
               options.googleAppID != "placeholder"
            {
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

        let locMgr = LocalizationManager()
        let locProvider = AppLocationProvider()

        let client = APIClient(
            configuration: networkConfig,
            authTokenProvider: authMgr.authTokenProvider,
            locationProvider: locProvider,
            logger: apiLogger
        )

        let wsManager = WebSocketManager(
            configuration: networkConfig,
            logger: apiLogger,
            authTokenProvider: authMgr.authTokenProvider
        )

        let repos = RepositoryProvider(
            client: client,
            webSocketManager: wsManager,
            authTokenProvider: authMgr.authTokenProvider,
            configuration: appConfig,
            localization: locMgr
        )

        let mp = MediaPlayer()

        let resolver = StreamResolver(
            mediaRepository: repos.media,
            contentRepository: repos.content,
            liveTVRepository: repos.liveTV,
            radioRepository: repos.radio,
            podcastRepository: repos.podcasts,
            audiobookRepository: repos.audiobook
        )

        authMgr.onSignOut = {
            KeychainHelper.deleteCredentials()
            KeychainHelper.deleteBiometricRefreshToken()
        }
        authMgr.onRefreshTokenRotated = { newToken in
            KeychainHelper.storeBiometricRefreshToken(newToken)
        }

        _authManager = State(initialValue: authMgr)
        _localizationManager = State(initialValue: locMgr)
        _apiClient = State(initialValue: client)
        _repositories = State(initialValue: repos)
        _mediaPlayer = State(initialValue: mp)
        _locationProvider = State(initialValue: locProvider)
        _audioPlaybackManager = State(initialValue: AudioPlaybackManager(
            mediaPlayer: mp,
            streamResolver: resolver,
            mediaRepository: repos.media
        ))
        _downloadManager = State(initialValue: DownloadManager(
            userRepository: repos.user,
            store: DownloadStore(),
            localization: locMgr
        ))

        // Expose shared instances for CarPlay and other secondary scenes
        AppDelegate.sharedRepositories = repos
        AppDelegate.sharedMediaPlayer = mp
        AppDelegate.sharedStreamResolver = resolver
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
                .environment(uiPreferences)
                .environment(castSessionManager)
                .environment(audioPlaybackManager)
                .environment(downloadManager)
                .environment(networkMonitor)
                .environment(byocManager)
                .environment(tooltipManager)
                .task {
                    // UI testing support — run first to avoid auth screen flash
                    if let testToken = UITestingSupport.testAuthToken {
                        authManager.configureForUITesting(token: testToken)
                    }
                    if UITestingSupport.seedBYOCYouTube {
                        byocManager.seedTestYouTubeContent()
                    }
                    if UITestingSupport.isSkipAuth {
                        coordinator.showingAuth = false
                    } else {
                        #if DEBUG
                            await loginWithDebugCredentials()
                        #else
                            coordinator.showingAuth = !authManager.isAuthenticated
                        #endif
                    }
                    if let testRoute = UITestingSupport.navigateToRoute,
                       let url = URL(string: "bayitplus://\(testRoute)")
                    {
                        coordinator.handleDeepLink(url)
                    }
                    if let testLang = UITestingSupport.testLanguage,
                       let language = Language(rawValue: testLang)
                    {
                        localizationManager.setLanguage(language)
                    }

                    byocManager.configureEnrichment(
                        baseURL: AppConfiguration().apiBaseURL
                    )
                    initializeWidgetBridge()
                    initializeCrashlyticsContext()
                    initializePushNotifications()
                    initializeCastSystem()
                    await downloadManager.initialize()
                    await pendingIntentHandler?.processPendingIntents()
                    tooltipManager.updateUserId(authManager.user?.id ?? "anonymous")
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
                    tooltipManager.updateUserId(authManager.user?.id ?? "anonymous")
                }
            #if DEBUG
                .onChange(of: authManager.isAuthenticated) { _, isAuth in
                    if !isAuth, BayitPlusApp.hasDebugCredentials {
                        Task { await loginWithDebugCredentials() }
                    }
                }
            #endif
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
        }
    }
}
