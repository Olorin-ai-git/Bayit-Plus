import BayitAnalytics
import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import BayitNetworking
import FirebaseCrashlytics
import FirebaseCore
import Foundation
import SwiftUI
import UIKit

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
        if FirebaseApp.app() == nil,
           let options = FirebaseOptions.defaultOptions(),
           options.googleAppID != "placeholder" {
            FirebaseApp.configure()
        }

        #if !DEBUG
        Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)
        #endif

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

        Self.configureTabBarAppearance()
    }

    private static func configureTabBarAppearance() {
        let darkPurple = UIColor(red: 0x58 / 255.0, green: 0x1C / 255.0, blue: 0x87 / 255.0, alpha: 1.0)
        let brandPurple = UIColor(red: 0x7E / 255.0, green: 0x22 / 255.0, blue: 0xCE / 255.0, alpha: 1.0)
        let lightPurple = UIColor(red: 0xA8 / 255.0, green: 0x55 / 255.0, blue: 0xF7 / 255.0, alpha: 1.0)

        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = UIColor(red: 0x0D / 255.0, green: 0x0D / 255.0, blue: 0x1A / 255.0, alpha: 0.85)

        // Normal state - muted white icons and text
        let normalAttrs: [NSAttributedString.Key: Any] = [
            .foregroundColor: UIColor.white.withAlphaComponent(0.6),
            .font: UIFont.systemFont(ofSize: 28, weight: .medium),
        ]

        // Focused state - purple border look with transparent bg
        let focusedAttrs: [NSAttributedString.Key: Any] = [
            .foregroundColor: lightPurple,
            .font: UIFont.systemFont(ofSize: 30, weight: .semibold),
        ]

        // Selected state
        let selectedAttrs: [NSAttributedString.Key: Any] = [
            .foregroundColor: brandPurple,
            .font: UIFont.systemFont(ofSize: 28, weight: .semibold),
        ]

        // Apply to all layout styles
        for itemAppearance in [appearance.stackedLayoutAppearance, appearance.inlineLayoutAppearance, appearance.compactInlineLayoutAppearance] {
            // Normal
            itemAppearance.normal.titleTextAttributes = normalAttrs
            itemAppearance.normal.iconColor = UIColor.white.withAlphaComponent(0.6)

            // Focused
            itemAppearance.focused.titleTextAttributes = focusedAttrs
            itemAppearance.focused.iconColor = lightPurple
            itemAppearance.focused.badgeBackgroundColor = darkPurple

            // Selected
            itemAppearance.selected.titleTextAttributes = selectedAttrs
            itemAppearance.selected.iconColor = brandPurple
        }

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().tintColor = lightPurple
        UITabBar.appearance().unselectedItemTintColor = UIColor.white.withAlphaComponent(0.6)
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
