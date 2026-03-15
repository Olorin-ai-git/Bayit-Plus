import BayitAuth
import BayitCore
import Foundation

#if DEBUG && os(iOS)

    // MARK: - Debug Auto-Login

    extension BayitPlusApp {
        /// Whether debug credentials are configured in Info.plist or env vars.
        static var hasDebugCredentials: Bool {
            resolvedDebugCredentials() != nil
        }

        /// Authenticate silently using debug credentials from Info.plist or env vars.
        /// Credential resolution order:
        ///   1. LOGIN_EMAIL / LOGIN_PASSWORD Xcode scheme environment variables
        ///   2. Info.plist keys (set via Debug.xcconfig → Local.xcconfig)
        /// Must NOT use APIClient — its auth layer requires a token to already exist.
        func loginWithDebugCredentials() async {
            guard let (email, password) = BayitPlusApp.resolvedDebugCredentials() else {
                // No debug credentials configured — preserve any existing session rather than
                // unconditionally showing auth (unlike tvOS which always shows the login screen,
                // iOS may have a valid session from a prior biometric or manual login).
                coordinator.showingAuth = !authManager.isAuthenticated
                return
            }

            do {
                let authServiceURL = resolvedDebugAuthServiceURL()
                let loginURL = authServiceURL.appendingPathComponent("api/v1/auth/login")
                var request = URLRequest(url: loginURL)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
                request.httpBody = try JSONEncoder().encode(
                    DebugAutoLoginBody(email: email, password: password, tenantId: "bayit_plus")
                )

                let (data, _) = try await URLSession.shared.data(for: request)

                let decoder = JSONDecoder()
                decoder.keyDecodingStrategy = .convertFromSnakeCase
                let response = try decoder.decode(DebugAutoLoginResponse.self, from: data)

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
                coordinator.showingAuth = !authManager.isAuthenticated
            }
        }

        // MARK: - Private

        private static func resolvedDebugCredentials() -> (email: String, password: String)? {
            let envEmail = ProcessInfo.processInfo.environment["LOGIN_EMAIL"] ?? ""
            let envPassword = ProcessInfo.processInfo.environment["LOGIN_PASSWORD"] ?? ""
            if !envEmail.isEmpty, !envPassword.isEmpty {
                return (envEmail, envPassword)
            }

            let info = Bundle.main.infoDictionary ?? [:]
            let plistEmail = info["LOGIN_EMAIL"] as? String ?? ""
            let plistPassword = info["LOGIN_PASSWORD"] as? String ?? ""
            if !plistEmail.isEmpty, !plistPassword.isEmpty {
                return (plistEmail, plistPassword)
            }

            return nil
        }

        private func resolvedDebugAuthServiceURL() -> URL {
            let info = Bundle.main.infoDictionary ?? [:]
            if let urlString = info["AUTH_SERVICE_URL"] as? String
                ?? ProcessInfo.processInfo.environment["AUTH_SERVICE_URL"],
                let url = URL(string: urlString)
            {
                return url
            }
            return URL(string: "https://auth.olorin.ai")!
        }
    }

    // MARK: - Supporting Types (iOS debug-only)

    private struct DebugAutoLoginBody: Encodable, Sendable {
        let email: String
        let password: String
        let tenantId: String

        private enum CodingKeys: String, CodingKey {
            case email
            case password
            case tenantId = "tenant_id"
        }
    }

    private struct DebugAutoLoginResponse: Decodable, Sendable {
        let accessToken: String
        let refreshToken: String?
        let userId: String?
        let email: String?
        let name: String?
        let avatar: String?
        let role: String?
    }
#endif
