import BayitCore
import Foundation

/// Google Device Authorization flow for tvOS (limited-input device).
/// User visits google.com/device and enters a code to authorize.
public actor YouTubeAuthService {
    private let clientId: String
    private let clientSecret: String
    private let logger = BayitLogger(category: "YouTubeAuth")
    private static let deviceCodeURL = "https://oauth2.googleapis.com/device/code"
    private static let tokenURL = "https://oauth2.googleapis.com/token"
    private static let scope = "https://www.googleapis.com/auth/youtube.readonly"

    public init(clientId: String, clientSecret: String) {
        self.clientId = clientId
        self.clientSecret = clientSecret
    }

    /// Request a device authorization code from Google.
    public func requestDeviceCode() async throws -> GoogleDeviceCode {
        guard !clientId.isEmpty, !clientId.contains("$(") else {
            throw YouTubeError.missingClientId
        }
        let body = "client_id=\(clientId)&scope=\(Self.scope)"
        guard let url = URL(string: Self.deviceCodeURL) else {
            throw YouTubeError.invalidDeviceCodeResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = body.data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw YouTubeError.invalidDeviceCodeResponse
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let deviceCode = json["device_code"] as? String,
              let userCode = json["user_code"] as? String,
              let verificationUrl = json["verification_url"] as? String,
              let expiresIn = json["expires_in"] as? Int,
              let interval = json["interval"] as? Int
        else {
            throw YouTubeError.invalidDeviceCodeResponse
        }

        logger.info("Device code requested", context: ["userCode": userCode])

        return GoogleDeviceCode(
            deviceCode: deviceCode,
            userCode: userCode,
            verificationUrl: verificationUrl,
            expiresIn: expiresIn,
            interval: interval
        )
    }

    /// Poll Google for the OAuth token after user authorizes.
    public func pollForToken(deviceCode: GoogleDeviceCode) async throws -> YouTubeTokens {
        let pollInterval = max(deviceCode.interval, 5)
        let maxAttempts = deviceCode.expiresIn / pollInterval

        for _ in 0 ..< maxAttempts {
            try await Task.sleep(for: .seconds(pollInterval))

            if deviceCode.isExpired {
                throw YouTubeError.authorizationExpired
            }

            let result = try await exchangeDeviceCode(deviceCode.deviceCode)
            switch result {
            case let .success(tokens):
                logger.info("YouTube authorization successful")
                return tokens
            case .pending:
                continue
            case .denied:
                throw YouTubeError.authorizationDenied
            case .expired:
                throw YouTubeError.authorizationExpired
            }
        }

        throw YouTubeError.authorizationExpired
    }

    private func exchangeDeviceCode(_ code: String) async throws -> TokenExchangeResult {
        guard let url = URL(string: Self.tokenURL) else {
            throw YouTubeError.invalidResponse
        }

        let body = [
            "client_id=\(clientId)",
            "client_secret=\(clientSecret)",
            "device_code=\(code)",
            "grant_type=urn:ietf:params:oauth:grant-type:device_code",
        ].joined(separator: "&")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = body.data(using: .utf8)

        let (data, _) = try await URLSession.shared.data(for: request)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw YouTubeError.invalidResponse
        }

        if let accessToken = json["access_token"] as? String {
            let refreshToken = json["refresh_token"] as? String
            return .success(YouTubeTokens(accessToken: accessToken, refreshToken: refreshToken))
        }

        let error = json["error"] as? String ?? ""
        switch error {
        case "authorization_pending": return .pending
        case "slow_down": return .pending
        case "access_denied": return .denied
        case "expired_token": return .expired
        default: throw YouTubeError.invalidResponse
        }
    }
}

/// OAuth tokens from Google.
public struct YouTubeTokens: Sendable {
    public let accessToken: String
    public let refreshToken: String?
}

private enum TokenExchangeResult {
    case success(YouTubeTokens)
    case pending
    case denied
    case expired
}
