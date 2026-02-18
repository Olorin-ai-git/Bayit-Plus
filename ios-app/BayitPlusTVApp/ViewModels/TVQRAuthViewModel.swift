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

    private let authManager: AuthManager
    private let logger: APILogger
    private let config: AppConfiguration
    nonisolated private var webSocketTask: URLSessionWebSocketTask?
    nonisolated private var refreshTask: Task<Void, Never>?
    nonisolated private var initTask: Task<Void, Never>?
    nonisolated private var pollingTask: Task<Void, Never>?
    nonisolated private var pingTask: Task<Void, Never>?
    private var lastInitTime: Date?

    /// When true, a WebSocket message has already updated the state;
    /// polling becomes a no-op until the next session.
    private var wsDeliveredUpdate = false

    // MARK: - Response Models

    private struct InitSessionResponse: Decodable {
        let sessionId: String
        let pairingCode: String
        let expiresAt: String

        private enum CodingKeys: String, CodingKey {
            case sessionId = "session_id"
            case pairingCode = "pairing_code"
            case expiresAt = "expires_at"
        }
    }

    private struct WebSocketMessage: Decodable {
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

    private struct PollStatusResponse: Decodable {
        let sessionId: String
        let status: String
        let isExpired: Bool
        let expiresAt: String
        let hasCompanion: Bool
        let accessToken: String?
        let authenticatedUserId: String?
        let user: BayitUser?

        private enum CodingKeys: String, CodingKey {
            case sessionId = "session_id"
            case status
            case isExpired = "is_expired"
            case expiresAt = "expires_at"
            case hasCompanion = "has_companion"
            case accessToken = "access_token"
            case authenticatedUserId = "authenticated_user_id"
            case user
        }
    }

    // MARK: - Init

    init(authManager: AuthManager, logger: APILogger) {
        self.authManager = authManager
        self.logger = logger
        self.config = AppConfiguration()
    }

    deinit {
        cleanup()
    }

    // MARK: - Session Lifecycle

    /// Minimum interval between session init requests (client-side throttle).
    private static let minInitInterval: TimeInterval = 5.0

    /// Maximum allowed WebSocket message size in bytes (10 KB).
    private static let maxWebSocketMessageSize = 10_240

    /// Initializes a new device pairing session with the backend.
    func initSession() async {
        if let lastInit = lastInitTime,
           Date().timeIntervalSince(lastInit) < Self.minInitInterval {
            logger.debug(
                "Session init throttled",
                metadata: ["interval": "\(Self.minInitInterval)s"]
            )
            return
        }
        lastInitTime = Date()

        status = .loading
        error = nil

        let url = config.apiBaseURL
            .appendingPathComponent("auth/device-pairing/init")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("tvos", forHTTPHeaderField: "X-Client-Platform")
        request.timeoutInterval = config.apiTimeout

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
                throw AuthError.devicePairingFailed(
                    underlying: "Backend returned HTTP \(statusCode)"
                )
            }

            let decoded = try JSONDecoder().decode(
                InitSessionResponse.self, from: data
            )

            sessionId = decoded.sessionId
            qrCodeData = decoded.pairingCode
            status = .waitingForScan
            wsDeliveredUpdate = false

            logger.debug(
                "Device pairing session initialized",
                metadata: [
                    "session_id_prefix": String(decoded.sessionId.prefix(8)),
                    "expires_at": decoded.expiresAt,
                ]
            )

            connectWebSocket(sessionId: decoded.sessionId)
            startPolling(sessionId: decoded.sessionId)
            scheduleRefreshOnExpiry(expiresAt: decoded.expiresAt)
        } catch let authError as AuthError {
            status = .failed
            error = authError.userFacingMessage
            logger.warning(
                "Device pairing init failed",
                metadata: ["error": authError.localizedDescription]
            )
        } catch {
            status = .failed
            self.error = AuthError.devicePairingFailed(
                underlying: error.localizedDescription
            ).userFacingMessage
            logger.warning(
                "Device pairing init failed",
                metadata: ["error": error.localizedDescription]
            )
        }
    }

    /// Retries the pairing session from scratch.
    func retry() async {
        cleanup()
        await initSession()
    }

    // MARK: - WebSocket

    private func connectWebSocket(sessionId: String) {
        guard var components = URLComponents(
            url: config.webSocketBaseURL,
            resolvingAgainstBaseURL: true
        ) else {
            logger.warning(
                "Invalid WebSocket base URL",
                metadata: ["url": config.webSocketBaseURL.absoluteString]
            )
            status = .failed
            return
        }

        components.path = "/api/v1/auth/device-pairing/ws/\(sessionId)"

        guard let wsURL = components.url else {
            logger.warning("Failed to construct WebSocket URL", metadata: [:])
            status = .failed
            return
        }

        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = config.apiTimeout
        sessionConfig.waitsForConnectivity = true

        let session = URLSession(configuration: sessionConfig)
        let task = session.webSocketTask(with: wsURL)
        task.maximumMessageSize = Self.maxWebSocketMessageSize
        webSocketTask = task
        task.resume()

        logger.debug(
            "WebSocket connecting for device pairing",
            metadata: ["url": wsURL.absoluteString]
        )

        listenForMessages()
        startPing()
    }

    private var isTerminalStatus: Bool {
        status == .authenticated || status == .failed || status == .expired
    }

    private func listenForMessages() {
        guard !isTerminalStatus else { return }

        webSocketTask?.receive { [weak self] result in
            Task { @MainActor [weak self] in
                guard let self, !self.isTerminalStatus else { return }

                switch result {
                case .success(let message):
                    self.handleWebSocketMessage(message)
                    if !self.isTerminalStatus {
                        self.listenForMessages()
                    }

                case .failure(let wsError):
                    self.logger.warning(
                        "WebSocket error in device pairing",
                        metadata: ["error": wsError.localizedDescription]
                    )
                    if !self.isTerminalStatus {
                        self.status = .failed
                        self.error = AuthError.devicePairingFailed(
                            underlying: wsError.localizedDescription
                        ).userFacingMessage
                    }
                }
            }
        }
    }

    private func handleWebSocketMessage(
        _ message: URLSessionWebSocketTask.Message
    ) {
        let data: Data
        switch message {
        case .string(let text):
            guard let textData = text.data(using: .utf8) else { return }
            data = textData
        case .data(let binaryData):
            data = binaryData
        @unknown default:
            return
        }

        guard let decoded = try? JSONDecoder().decode(
            WebSocketMessage.self, from: data
        ) else {
            logger.warning(
                "Failed to decode WebSocket message",
                metadata: [
                    "raw": String(data: data, encoding: .utf8) ?? "binary"
                ]
            )
            return
        }

        switch decoded.type {
        case "connected":
            logger.debug(
                "Device pairing WebSocket connected",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )

        case "companion_connected":
            wsDeliveredUpdate = true
            status = .companionConnected
            logger.info(
                "Companion device connected for pairing",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )

        case "authenticating":
            wsDeliveredUpdate = true
            status = .authenticating
            logger.info(
                "Companion device authenticating",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )

        case "pairing_success":
            wsDeliveredUpdate = true
            handlePairingSuccess(decoded)

        case "session_expired":
            status = .expired
            error = AuthError.sessionExpired.userFacingMessage
            logger.info(
                "Device pairing session expired",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )
            cleanup()

        case "pairing_failed":
            status = .failed
            error = AuthError.devicePairingFailed(
                underlying: "Companion device authentication failed"
            ).userFacingMessage
            cleanup()

        case "error":
            status = .failed
            error = AuthError.devicePairingFailed(
                underlying: decoded.message ?? "Session not found"
            ).userFacingMessage
            logger.warning(
                "Device pairing error from server",
                metadata: [
                    "message": decoded.message ?? "unknown",
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )
            cleanup()

        default:
            logger.debug(
                "Unhandled WebSocket message type",
                metadata: ["type": decoded.type]
            )
        }
    }

    private func handlePairingSuccess(_ message: WebSocketMessage) {
        status = .authenticating

        guard let accessToken = message.accessToken,
              let user = message.user else {
            status = .failed
            error = AuthError.devicePairingFailed(
                underlying: "Missing credentials in pairing response"
            ).userFacingMessage
            return
        }

        do {
            try authManager.signInFromDevicePairing(
                accessToken: accessToken,
                refreshToken: message.refreshToken,
                user: user
            )
            status = .authenticated
            cleanup()
        } catch {
            status = .failed
            self.error = AuthError.devicePairingFailed(
                underlying: error.localizedDescription
            ).userFacingMessage
            cleanup()
        }
    }

    // MARK: - Polling Fallback

    /// Interval between status polls (seconds).
    private static let pollingInterval: TimeInterval = 3.0

    /// Starts a background polling loop that calls GET /status/{sessionId}
    /// every 3 seconds. Acts as a fallback when WebSocket messages are lost
    /// (e.g., due to multi-worker deployment or network issues).
    private func startPolling(sessionId: String) {
        pollingTask?.cancel()

        let url = config.apiBaseURL
            .appendingPathComponent("auth/device-pairing/status/\(sessionId)")

        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(Self.pollingInterval))
                guard let self, !Task.isCancelled, !self.isTerminalStatus else { return }

                // Skip if WebSocket already delivered the update
                if self.wsDeliveredUpdate { continue }

                do {
                    var request = URLRequest(url: url)
                    request.setValue(
                        "tvos", forHTTPHeaderField: "X-Client-Platform"
                    )
                    request.timeoutInterval = self.config.apiTimeout

                    let (data, response) = try await URLSession.shared.data(
                        for: request
                    )

                    guard let httpResponse = response as? HTTPURLResponse,
                          httpResponse.statusCode == 200 else { continue }

                    // Re-check after await in case WS delivered meanwhile
                    if self.wsDeliveredUpdate || self.isTerminalStatus { continue }

                    let poll = try JSONDecoder().decode(
                        PollStatusResponse.self, from: data
                    )

                    self.handlePollResponse(poll)
                } catch {
                    self.logger.debug(
                        "Polling status check failed",
                        metadata: ["error": error.localizedDescription]
                    )
                }
            }
        }
    }

    private func handlePollResponse(_ poll: PollStatusResponse) {
        switch poll.status {
        case "scanning" where status == .waitingForScan:
            status = .companionConnected
            logger.info(
                "Companion connected (detected via polling)",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )

        case "authenticating"
            where status == .waitingForScan || status == .companionConnected:
            status = .authenticating
            logger.info(
                "Authenticating (detected via polling)",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )

        case "success":
            handlePollSuccess(poll)

        case "failed":
            status = .failed
            error = AuthError.devicePairingFailed(
                underlying: "Authentication failed"
            ).userFacingMessage
            cleanup()

        case "expired":
            status = .expired
            error = AuthError.sessionExpired.userFacingMessage
            cleanup()

        default:
            break
        }
    }

    private func handlePollSuccess(_ poll: PollStatusResponse) {
        guard let accessToken = poll.accessToken,
              let user = poll.user else {
            // Token/user not yet available in status response; keep polling
            logger.debug(
                "Poll returned success but missing credentials; retrying",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )
            return
        }

        status = .authenticating

        do {
            try authManager.signInFromDevicePairing(
                accessToken: accessToken,
                refreshToken: nil,
                user: user
            )
            status = .authenticated
            cleanup()
        } catch {
            status = .failed
            self.error = AuthError.devicePairingFailed(
                underlying: error.localizedDescription
            ).userFacingMessage
            cleanup()
        }
    }

    // MARK: - WebSocket Keepalive

    /// Interval between WebSocket pings (seconds).
    private static let pingInterval: TimeInterval = 15.0

    /// Sends periodic ping messages to keep the WebSocket connection alive
    /// and detect dead connections early.
    private func startPing() {
        pingTask?.cancel()

        pingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(Self.pingInterval))
                guard let self, !Task.isCancelled, !self.isTerminalStatus else { return }
                guard let ws = self.webSocketTask else { return }

                let pingMessage = URLSessionWebSocketTask.Message.string(
                    "{\"type\":\"ping\"}"
                )
                do {
                    try await ws.send(pingMessage)
                } catch {
                    self.logger.debug(
                        "WebSocket ping failed; connection may be dead",
                        metadata: ["error": error.localizedDescription]
                    )
                    // Don't set failed status -- polling fallback will handle it
                }
            }
        }
    }

    // MARK: - Expiry Refresh

    private func scheduleRefreshOnExpiry(expiresAt: String) {
        refreshTask?.cancel()

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [
            .withInternetDateTime, .withFractionalSeconds,
        ]

        guard let expiryDate = formatter.date(from: expiresAt)
            ?? ISO8601DateFormatter().date(from: expiresAt) else {
            return
        }

        let delay = max(
            expiryDate.timeIntervalSinceNow - 2,
            0
        )

        refreshTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(delay))
            guard let self, !Task.isCancelled else { return }
            if self.status == .waitingForScan {
                self.logger.info(
                    "QR code expired, auto-refreshing",
                    metadata: [
                        "session_id_prefix": String(
                            (self.sessionId ?? "unknown").prefix(8)
                        ),
                    ]
                )
                self.status = .expired
                await self.retry()
            }
        }
    }

    // MARK: - Cleanup

    nonisolated private func cleanup() {
        initTask?.cancel()
        initTask = nil
        refreshTask?.cancel()
        refreshTask = nil
        pollingTask?.cancel()
        pollingTask = nil
        pingTask?.cancel()
        pingTask = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
    }
}
