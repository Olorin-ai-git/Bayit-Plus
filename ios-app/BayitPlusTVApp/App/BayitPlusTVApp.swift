import BayitAuth
import BayitCore
import BayitLocalization
import BayitMedia
import BayitNetworking
import FirebaseCore
import SwiftUI

@main
struct BayitPlusTVApp: App {
    @State private var coordinator = TVNavigationCoordinator()
    @State private var authManager: AuthManager
    @State private var localizationManager: LocalizationManager
    @State private var apiClient: APIClient
    @State private var repositories: TVRepositoryProvider
    @State private var mediaPlayer = MediaPlayer()

    init() {
        FirebaseApp.configure()

        let appConfig = AppConfiguration()
        let apiLogger = TVAppAPILogger()

        let networkConfig = TVAppNetworkConfiguration(appConfig: appConfig)
        let authConfig = TVAppAuthConfiguration()

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

        _authManager = State(initialValue: authMgr)
        _localizationManager = State(initialValue: LocalizationManager())
        _apiClient = State(initialValue: client)
        _repositories = State(initialValue: TVRepositoryProvider(
            client: client,
            webSocketManager: wsManager,
            authTokenProvider: authMgr.authTokenProvider
        ))
    }

    var body: some Scene {
        WindowGroup {
            TVContentView()
                .environment(coordinator)
                .environment(authManager)
                .environment(localizationManager)
                .environment(repositories)
                .environment(mediaPlayer)
                .bayitLocalization(localizationManager)
                .preferredColorScheme(.dark)
                .task {
                    #if DEBUG
                    if ProcessInfo.processInfo.arguments.contains("-skipAuth") {
                        let devUser = BayitUser(
                            id: "dev-user",
                            email: "dev@bayit.tv",
                            displayName: "Dev User",
                            photoURL: nil,
                            role: .admin,
                            isActive: true,
                            subscription: nil,
                            isBetaUser: true,
                            isVerified: true,
                            createdAt: nil,
                            lastLogin: nil
                        )
                        try? authManager.signInFromDevicePairing(
                            accessToken: "dev-token",
                            refreshToken: nil,
                            user: devUser
                        )
                        coordinator.showingAuth = false
                        return
                    }
                    #endif
                    coordinator.showingAuth = !authManager.isAuthenticated
                }
        }
    }
}
