import BayitAuth
import BayitCore
import Foundation

// MARK: - Auto Login via Environment Credentials

extension BayitPlusTVApp {
    /// Whether an AutoLoginConfig.plist is bundled (TestFlight builds only — never ship to App Store).
    static var hasAutoLoginConfig: Bool {
        Bundle.main.url(forResource: "AutoLoginConfig", withExtension: "plist") != nil
    }

    /// Authenticate via auth.olorin.ai /api/v1/auth/login using a plain URLSession POST.
    /// Must NOT use APIClient — its auth layer throws before sending if no token exists.
    /// Credential sources (first non-empty wins):
    ///   1. LOGIN_EMAIL / LOGIN_PASSWORD environment variables (Xcode scheme, simulator)
    ///   2. AutoLoginConfig.plist bundled in the app (TestFlight builds)
    func loginWithCredentials() async {
        guard let (email, password) = resolvedAutoLoginCredentials() else {
            coordinator.showingAuth = true
            return
        }

        do {
            let authServiceURL = resolvedAuthServiceURL()
            let loginURL = authServiceURL.appendingPathComponent("api/v1/auth/login")
            var request = URLRequest(url: loginURL)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("tvos", forHTTPHeaderField: "X-Client-Platform")
            request.httpBody = try JSONEncoder().encode(
                AutoLoginBody(email: email, password: password, tenantId: "bayit_plus")
            )

            let (data, _) = try await URLSession.shared.data(for: request)

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let response = try decoder.decode(AutoLoginResponse.self, from: data)

            let role: UserRole = {
                switch response.role {
                case "super_admin", "admin": return .admin
                default: return .user
                }
            }()

            let user = BayitUser(
                id: response.userId ?? "",
                email: response.email ?? email,
                displayName: response.name ?? "",
                photoURL: response.avatar.flatMap { URL(string: $0) },
                role: role,
                isActive: true,
                subscription: nil,
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

    private func resolvedAuthServiceURL() -> URL {
        let info = Bundle.main.infoDictionary ?? [:]
        if let urlString = info["AUTH_SERVICE_URL"] as? String
            ?? ProcessInfo.processInfo.environment["AUTH_SERVICE_URL"],
            let url = URL(string: urlString)
        {
            return url
        }
        return URL(string: "https://auth.olorin.ai")!
    }

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
    let tenantId: String

    private enum CodingKeys: String, CodingKey {
        case email
        case password
        case tenantId = "tenant_id"
    }
}

/// Flat response from auth.olorin.ai AuthResponse schema.
struct AutoLoginResponse: Decodable, Sendable {
    let accessToken: String
    let refreshToken: String?
    let userId: String?
    let email: String?
    let name: String?
    let avatar: String?
    let role: String?
}
