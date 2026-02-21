import BayitAuth
import BayitCore
import BayitNetworking
import Foundation

// MARK: - Auto Login via Environment Credentials

extension BayitPlusTVApp {
    /// Authenticate via backend /auth/login using credentials from launch environment.
    /// Pass -autoLogin flag and set LOGIN_EMAIL / LOGIN_PASSWORD environment variables.
    func loginWithCredentials() async {
        let email = ProcessInfo.processInfo.environment["LOGIN_EMAIL"] ?? ""
        let password = ProcessInfo.processInfo.environment["LOGIN_PASSWORD"] ?? ""
        guard !email.isEmpty, !password.isEmpty else {
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
