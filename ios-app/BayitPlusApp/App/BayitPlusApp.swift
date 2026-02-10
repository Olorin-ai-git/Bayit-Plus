import BayitAuth
import BayitCore
import BayitLocalization
import BayitMedia
import BayitNetworking
import BayitWidgetShared
import FirebaseCore
import GoogleSignIn
import SwiftUI

@main
struct BayitPlusApp: App {
    @State private var coordinator = NavigationCoordinator()
    @State private var authManager: AuthManager
    @State private var localizationManager: LocalizationManager
    @State private var apiClient: APIClient
    @State private var repositories: RepositoryProvider
    @State private var mediaPlayer = MediaPlayer()
    @State private var widgetSyncService = WidgetDataSyncService()
    @State private var liveActivityManager = LiveActivityManager()
    @State private var locationProvider: AppLocationProvider
    @State private var featureFlags = FeatureFlags()

    init() {
        FirebaseApp.configure()

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
