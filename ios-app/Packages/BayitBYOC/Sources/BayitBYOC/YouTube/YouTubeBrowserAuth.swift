#if os(iOS)
    import AuthenticationServices
    import BayitCore
    import Foundation

    /// Browser-based YouTube OAuth using ASWebAuthenticationSession.
    /// Falls back to device code flow if browser auth fails.
    public actor YouTubeBrowserAuthService {
        private let clientId: String
        private let clientSecret: String
        private let redirectURI: String
        private let logger = BayitLogger(category: "YouTubeBrowserAuth")

        private static let authURL = "https://accounts.google.com/o/oauth2/v2/auth"
        private static let tokenURL = "https://oauth2.googleapis.com/token"
        private static let scope = "https://www.googleapis.com/auth/youtube.readonly"

        public init(clientId: String, clientSecret: String, redirectURI: String) {
            self.clientId = clientId
            self.clientSecret = clientSecret
            self.redirectURI = redirectURI
        }

        /// Authenticate via browser OAuth. Returns tokens on success.
        public func authenticate() async throws -> YouTubeTokens {
            let authCode = try await requestAuthorizationCode()
            return try await exchangeCodeForTokens(authCode)
        }

        private func requestAuthorizationCode() async throws -> String {
            var components = URLComponents(string: Self.authURL)!
            components.queryItems = [
                URLQueryItem(name: "client_id", value: clientId),
                URLQueryItem(name: "redirect_uri", value: redirectURI),
                URLQueryItem(name: "response_type", value: "code"),
                URLQueryItem(name: "scope", value: Self.scope),
                URLQueryItem(name: "access_type", value: "offline"),
                URLQueryItem(name: "prompt", value: "consent"),
            ]

            guard let authURL = components.url else {
                throw YouTubeError.invalidResponse
            }

            let callbackScheme = URL(string: redirectURI)?.scheme

            return try await withCheckedThrowingContinuation { continuation in
                let session = ASWebAuthenticationSession(
                    url: authURL,
                    callbackURLScheme: callbackScheme
                ) { callbackURL, error in
                    if let error {
                        continuation.resume(throwing: error)
                        return
                    }

                    guard let callbackURL,
                          let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                          let code = components.queryItems?.first(where: { $0.name == "code" })?.value
                    else {
                        continuation.resume(throwing: YouTubeError.authorizationDenied)
                        return
                    }

                    continuation.resume(returning: code)
                }

                session.prefersEphemeralWebBrowserSession = false

                Task { @MainActor in
                    session.presentationContextProvider = BrowserAuthContextProvider.shared
                    session.start()
                }
            }
        }

        private func exchangeCodeForTokens(_ code: String) async throws -> YouTubeTokens {
            guard let url = URL(string: Self.tokenURL) else {
                throw YouTubeError.invalidResponse
            }

            let body = [
                "client_id=\(clientId)",
                "client_secret=\(clientSecret)",
                "code=\(code)",
                "grant_type=authorization_code",
                "redirect_uri=\(redirectURI)",
            ].joined(separator: "&")

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue(
                "application/x-www-form-urlencoded",
                forHTTPHeaderField: "Content-Type"
            )
            request.httpBody = body.data(using: .utf8)

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                logger.error("Token exchange failed")
                throw YouTubeError.invalidResponse
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let accessToken = json["access_token"] as? String
            else {
                throw YouTubeError.invalidResponse
            }

            let refreshToken = json["refresh_token"] as? String
            logger.info("Browser OAuth token exchange successful")

            return YouTubeTokens(
                accessToken: accessToken,
                refreshToken: refreshToken
            )
        }
    }

    /// Provides the presentation anchor for ASWebAuthenticationSession.
    @MainActor
    private final class BrowserAuthContextProvider: NSObject,
        ASWebAuthenticationPresentationContextProviding
    {
        static let shared = BrowserAuthContextProvider()

        func presentationAnchor(
            for _: ASWebAuthenticationSession
        ) -> ASPresentationAnchor {
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = scene.windows.first
            else {
                return ASPresentationAnchor()
            }
            return window
        }
    }
#endif
