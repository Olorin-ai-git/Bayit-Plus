import BayitAuth
import BayitCore
import BayitNetworking
import Foundation

/// Status of the QR code device pairing session.
enum PairingStatus: Equatable {
    case idle
    case loading
    case waitingForScan
    case companionConnected
    case authenticating
    case authenticated
    case failed
    case expired
}

/// ViewModel managing the QR code device pairing lifecycle for tvOS sign-in.
///
/// Uses raw `URLSession` and `URLSessionWebSocketTask` to communicate with
/// the backend device pairing API (no auth token available during sign-in).
@MainActor
@Observable
final class TVQRAuthViewModel {
    // MARK: - Published State

    private(set) var qrCodeData: String?
    private(set) var sessionId: String?
    private(set) var status: PairingStatus = .idle
    private(set) var error: String?

    // MARK: - Dependencies

    let authManager: AuthManager
    let logger: APILogger
    let config: AppConfiguration
    @ObservationIgnored nonisolated(unsafe) var webSocketTask: URLSessionWebSocketTask?
    @ObservationIgnored nonisolated(unsafe) var refreshTask: Task<Void, Never>?
    @ObservationIgnored nonisolated(unsafe) var initTask: Task<Void, Never>?
    @ObservationIgnored nonisolated(unsafe) var pollingTask: Task<Void, Never>?
    @ObservationIgnored nonisolated(unsafe) var pingTask: Task<Void, Never>?
    var lastInitTime: Date?

    /// When true, a WebSocket message has already updated the state;
    /// polling becomes a no-op until the next session.
    var wsDeliveredUpdate = false

    // MARK: - Response Models

    struct InitSessionResponse: Decodable {
        let sessionId: String
        let pairingCode: String
        let expiresAt: String

        private enum CodingKeys: String, CodingKey {
            case sessionId = "session_id"
            case pairingCode = "pairing_code"
            case expiresAt = "expires_at"
        }
    }

    struct WebSocketMessage: Decodable {
        let type: String
        let accessToken: String?
        let refreshToken: String?
        let user: BayitUser?
        let message: String?

        private enum CodingKeys: String, CodingKey {
            case type
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case user
            case message
        }
    }

    struct PollStatusResponse: Decodable {
        let sessionId: String
        let status: String
        let isExpired: Bool
        let expiresAt: String
        let hasCompanion: Bool
        let accessToken: String?
        let refreshToken: String?
        let authenticatedUserId: String?
        let user: BayitUser?

        private enum CodingKeys: String, CodingKey {
            case sessionId = "session_id"
            case status
            case isExpired = "is_expired"
            case expiresAt = "expires_at"
            case hasCompanion = "has_companion"
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case authenticatedUserId = "authenticated_user_id"
            case user
        }
    }

    // MARK: - Init

    init(authManager: AuthManager, logger: APILogger) {
        self.authManager = authManager
        self.logger = logger
        config = AppConfiguration()
    }

    deinit {
        cleanup()
    }
}
