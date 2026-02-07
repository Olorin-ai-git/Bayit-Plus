import BayitAuth
import BayitCore
import BayitLocalization
import BayitNetworking
import FirebaseCore
import SwiftUI

@main
struct BayitPlusApp: App {
    @State private var coordinator = NavigationCoordinator()
    @State private var authManager: AuthManager
    @State private var localizationManager: LocalizationManager
    @State private var apiClient: APIClient
    @State private var repositories: RepositoryProvider

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

        let client = APIClient(
            configuration: networkConfig,
            authTokenProvider: authMgr.authTokenProvider,
            locationProvider: AppLocationProvider(),
            logger: apiLogger
        )

        _authManager = State(initialValue: authMgr)
        _localizationManager = State(initialValue: LocalizationManager())
        _apiClient = State(initialValue: client)
        _repositories = State(initialValue: RepositoryProvider(client: client))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(coordinator)
                .environment(authManager)
                .environment(localizationManager)
                .environment(repositories)
                .bayitLocalization(localizationManager)
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    coordinator.handleDeepLink(url)
                }
                .task {
                    coordinator.showingAuth = !authManager.isAuthenticated
                }
        }
    }
}
