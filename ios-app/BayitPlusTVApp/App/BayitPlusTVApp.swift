import BayitAnalytics
import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import BayitNetworking
import FirebaseCore
import FirebaseCrashlytics
import Foundation
import SwiftUI

@main
struct BayitPlusTVApp: App {
    @State var coordinator = TVNavigationCoordinator(
        isAutoLoginInProgress: BayitPlusTVApp.hasAutoLoginConfig
    )
    @State var appConfig: AppConfiguration
    @State var authManager: AuthManager
    @State private var localizationManager: LocalizationManager
    @State var apiClient: APIClient
    @State private var repositories: TVRepositoryProvider
    @State private var downloadManager: DownloadManager
    @State private var mediaPlayer = MediaPlayer()
    @State private var audioPlaybackManager: TVAudioPlaybackManager?
    @State private var featureFlags = FeatureFlags()

    init() {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }

        #if !DEBUG
            Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)
        #endif

        let appConfig = AppConfiguration()
        let apiLogger = TVAppAPILogger()

        let networkConfig = TVAppNetworkConfiguration(appConfig: appConfig)
        let authConfig = AppAuthConfiguration()

        let authMgr = AuthManager(
            configuration: authConfig,
            logger: apiLogger
        )

        let client = APIClient(
            configuration: networkConfig,
            authTokenProvider: authMgr.authTokenProvider,
            locationProvider: TVLocationProvider(),
            logger: apiLogger
        )

        let wsManager = WebSocketManager(configuration: networkConfig, logger: apiLogger)

        let repos = TVRepositoryProvider(
            client: client,
            webSocketManager: wsManager,
            authTokenProvider: authMgr.authTokenProvider,
            configuration: appConfig
        )

        _appConfig = State(initialValue: appConfig)
        _authManager = State(initialValue: authMgr)
        _localizationManager = State(initialValue: LocalizationManager())
        _apiClient = State(initialValue: client)
        _repositories = State(initialValue: repos)
        _downloadManager = State(initialValue: DownloadManager(userRepository: repos.user, store: DownloadStore()))

        Self.configureTabBarAppearance()
    }

    var body: some Scene {
        WindowGroup {
            TVContentView()
                .environment(coordinator)
                .environment(\.appConfiguration, appConfig)
                .environment(authManager)
                .environment(localizationManager)
                .environment(repositories)
                .environment(downloadManager)
                .environment(mediaPlayer)
                .environment(featureFlags)
                .environment(resolvedAudioPlaybackManager)
                .bayitLocalization(localizationManager)
                .preferredColorScheme(.dark)
                .task {
                    await downloadManager.initialize()
                }
                .task {
                    defer { coordinator.isAutoLoginInProgress = false }
                    let useAutoLogin = ProcessInfo.processInfo.arguments.contains("-autoLogin")
                        || BayitPlusTVApp.hasAutoLoginConfig
                    if useAutoLogin {
                        await loginWithCredentials()
                        return
                    }
                    coordinator.showingAuth = !authManager.isAuthenticated
                }
        }
    }

    /// Lazily creates and caches the audio playback manager on first access.
    private var resolvedAudioPlaybackManager: TVAudioPlaybackManager {
        if let existing = audioPlaybackManager {
            return existing
        }
        let manager = TVAudioPlaybackManager(
            mediaPlayer: mediaPlayer,
            mediaRepository: repositories.media,
            radioRepository: repositories.radio,
            podcastRepository: repositories.podcasts
        )
        // Deferred mutation to avoid modifying state during view update
        DispatchQueue.main.async { [self] in
            audioPlaybackManager = manager
        }
        return manager
    }
}
