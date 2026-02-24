import BayitAuth
import BayitCore
import BayitNetworking
import Foundation

// MARK: - Auto Login via Environment Credentials

extension BayitPlusTVApp {
    /// Whether an AutoLoginConfig.plist is bundled (TestFlight builds only — never ship to App Store).
    static var hasAutoLoginConfig: Bool {
        Bundle.main.url(forResource: "AutoLoginConfig", withExtension: "plist") != nil
    }

    /// Authenticate via backend /auth/login.
    /// Credential sources (first non-empty wins):
    ///   1. LOGIN_EMAIL / LOGIN_PASSWORD environment variables (Xcode scheme, simulator)
    ///   2. AutoLoginConfig.plist bundled in the app (TestFlight builds)
    func loginWithCredentials() async {
        guard let (email, password) = resolvedAutoLoginCredentials() else {
            coordinator.showingAuth = true
            return
        }

        do {
            let response = try await apiClient.post(
                "auth/login",
                body: AutoLoginBody(email: email, password: password),
                as: AutoLoginResponse.self
            )

            let role: UserRole = {
                switch response.user?.role {
                case "super_admin", "admin": return .admin
                default: return .user
                }
            }()

            let user = BayitUser(
                id: response.user?.id ?? "",
                email: response.user?.email ?? email,
                displayName: response.user?.displayName ?? "",
                photoURL: nil,
                role: role,
                isActive: true,
                subscription: nil,
                isBetaUser: response.user?.isBetaUser ?? false,
                isVerified: true,
                createdAt: nil,
                lastLogin: nil
            )

            try authManager.signInFromDevicePairing(
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                user: user
            )
            coordinator.showingAuth = false
        } catch {
            coordinator.showingAuth = true
        }
    }

    // MARK: - Private

    private func resolvedAutoLoginCredentials() -> (email: String, password: String)? {
        let envEmail = ProcessInfo.processInfo.environment["LOGIN_EMAIL"] ?? ""
        let envPassword = ProcessInfo.processInfo.environment["LOGIN_PASSWORD"] ?? ""
        if !envEmail.isEmpty, !envPassword.isEmpty {
            return (envEmail, envPassword)
        }

        guard let url = Bundle.main.url(forResource: "AutoLoginConfig", withExtension: "plist"),
              let dict = NSDictionary(contentsOf: url),
              let email = dict["LOGIN_EMAIL"] as? String,
              let password = dict["LOGIN_PASSWORD"] as? String,
              !email.isEmpty, !password.isEmpty
        else { return nil }

        return (email, password)
    }
}

// MARK: - Auto-login Supporting Types

struct AutoLoginBody: Encodable, Sendable {
    let email: String
    let password: String
}

struct AutoLoginResponse: Decodable, Sendable {
    let accessToken: String
    let refreshToken: String?
    let user: AutoLoginUserPayload?
}

struct AutoLoginUserPayload: Decodable, Sendable {
    let id: String?
    let email: String?
    let displayName: String?
    let role: String?
    let isBetaUser: Bool?
}
