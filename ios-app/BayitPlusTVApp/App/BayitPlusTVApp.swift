import BayitAuth
import BayitCore
import BayitLocalization
import BayitMedia
import BayitNetworking
import FirebaseCore
import Foundation
import SwiftUI

@main
struct BayitPlusTVApp: App {
    @State private var coordinator = TVNavigationCoordinator()
    @State private var authManager: AuthManager
    @State private var localizationManager: LocalizationManager
    @State private var apiClient: APIClient
    @State private var repositories: TVRepositoryProvider
    @State private var mediaPlayer = MediaPlayer()
    @State private var featureFlags = FeatureFlags()

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
            authTokenProvider: authMgr.authTokenProvider,
            configuration: appConfig
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
                .environment(featureFlags)
                .bayitLocalization(localizationManager)
                .preferredColorScheme(.dark)
                .task {
                    if ProcessInfo.processInfo.arguments.contains("-autoLogin") {
                        await loginWithCredentials()
                        return
                    }
                    coordinator.showingAuth = !authManager.isAuthenticated
                }
        }
    }

    /// Authenticate via backend /auth/login using credentials from launch environment.
    /// Pass -autoLogin flag and set LOGIN_EMAIL / LOGIN_PASSWORD environment variables.
    private func loginWithCredentials() async {
        let email = ProcessInfo.processInfo.environment["LOGIN_EMAIL"] ?? ""
        let password = ProcessInfo.processInfo.environment["LOGIN_PASSWORD"] ?? ""
        guard !email.isEmpty, !password.isEmpty else {
            coordinator.showingAuth = true
            return
        }

        let appConfig = AppConfiguration()
        let loginURL = appConfig.apiBaseURL.appendingPathComponent("auth/login")

        var request = URLRequest(url: loginURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct LoginBody: Encodable { let email: String; let password: String }
        request.httpBody = try? JSONEncoder().encode(LoginBody(email: email, password: password))

        do {
            let (data, _) = try await URLSession.shared.data(for: request)

            struct LoginResponse: Decodable {
                let access_token: String
                let refresh_token: String?
                let user: UserPayload?
            }
            struct UserPayload: Decodable {
                let id: String?
                let email: String?
                let display_name: String?
                let role: String?
                let is_beta_user: Bool?
            }

            let response = try JSONDecoder().decode(LoginResponse.self, from: data)

            let role: UserRole = {
                switch response.user?.role {
                case "super_admin", "admin": return .admin
                default: return .user
                }
            }()

            let user = BayitUser(
                id: response.user?.id ?? "",
                email: response.user?.email ?? email,
                displayName: response.user?.display_name ?? "",
                photoURL: nil,
                role: role,
                isActive: true,
                subscription: nil,
                isBetaUser: response.user?.is_beta_user ?? false,
                isVerified: true,
                createdAt: nil,
                lastLogin: nil
            )

            try authManager.signInFromDevicePairing(
                accessToken: response.access_token,
                refreshToken: response.refresh_token,
                user: user
            )
            coordinator.showingAuth = false
        } catch {
            coordinator.showingAuth = true
        }
    }
}
