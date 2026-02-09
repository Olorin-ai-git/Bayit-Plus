import BayitAuth
import BayitCore
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
    private var webSocketTask: URLSessionWebSocketTask?
    private var refreshTask: Task<Void, Never>?

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

        private enum CodingKeys: String, CodingKey {
            case type
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
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

    /// Initializes a new device pairing session with the backend.
    func initSession() async {
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

            logger.debug(
                "Device pairing session initialized",
                metadata: [
                    "session_id": decoded.sessionId,
                    "expires_at": decoded.expiresAt,
                ]
            )

            connectWebSocket(sessionId: decoded.sessionId)
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
        let wsPath = "api/v1/auth/device-pairing/ws/\(sessionId)"
        let wsURL = config.webSocketBaseURL.appendingPathComponent(wsPath)

        let session = URLSession(configuration: .default)
        let task = session.webSocketTask(with: wsURL)
        webSocketTask = task
        task.resume()

        logger.debug(
            "WebSocket connecting for device pairing",
            metadata: ["url": wsURL.absoluteString]
        )

        listenForMessages()
    }

    private func listenForMessages() {
        webSocketTask?.receive { [weak self] result in
            guard let self else { return }

            switch result {
            case .success(let message):
                self.handleWebSocketMessage(message)
                self.listenForMessages()

            case .failure(let wsError):
                self.logger.warning(
                    "WebSocket error in device pairing",
                    metadata: ["error": wsError.localizedDescription]
                )
                if self.status != .authenticated {
                    self.status = .failed
                    self.error = AuthError.devicePairingFailed(
                        underlying: wsError.localizedDescription
                    ).userFacingMessage
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
        case "companion_connected":
            status = .companionConnected
            logger.info(
                "Companion device connected for pairing",
                metadata: ["session_id": sessionId ?? "unknown"]
            )

        case "pairing_success":
            handlePairingSuccess(decoded)

        case "session_expired":
            status = .expired
            error = AuthError.sessionExpired.userFacingMessage
            logger.info(
                "Device pairing session expired",
                metadata: ["session_id": sessionId ?? "unknown"]
            )

        case "pairing_failed":
            status = .failed
            error = AuthError.devicePairingFailed(
                underlying: "Companion device authentication failed"
            ).userFacingMessage

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
        } catch {
            status = .failed
            self.error = AuthError.devicePairingFailed(
                underlying: error.localizedDescription
            ).userFacingMessage
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
                self.status = .expired
                await self.retry()
            }
        }
    }

    // MARK: - Cleanup

    private func cleanup() {
        refreshTask?.cancel()
        refreshTask = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
    }
}
