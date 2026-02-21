import BayitAuth
import BayitCore
import BayitNetworking
import Foundation

// MARK: - TVQRAuthViewModel + Session Lifecycle

extension TVQRAuthViewModel {
    // MARK: - Session Lifecycle

    /// Minimum interval between session init requests (client-side throttle).
    static let minInitInterval: TimeInterval = 5.0

    /// Maximum allowed WebSocket message size in bytes (10 KB).
    static let maxWebSocketMessageSize = 10240

    var isTerminalStatus: Bool {
        status == .authenticated || status == .failed || status == .expired
    }

    /// Initializes a new device pairing session with the backend.
    func initSession() async {
        if let lastInit = lastInitTime,
           Date().timeIntervalSince(lastInit) < Self.minInitInterval
        {
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
                  httpResponse.statusCode == 200
            else {
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

    // MARK: - Expiry Refresh

    func scheduleRefreshOnExpiry(expiresAt: String) {
        refreshTask?.cancel()

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [
            .withInternetDateTime, .withFractionalSeconds,
        ]

        guard let expiryDate = formatter.date(from: expiresAt)
            ?? ISO8601DateFormatter().date(from: expiresAt)
        else {
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
                await self.retry()
            }
        }
    }

    // MARK: - Cleanup

    nonisolated func cleanup() {
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
