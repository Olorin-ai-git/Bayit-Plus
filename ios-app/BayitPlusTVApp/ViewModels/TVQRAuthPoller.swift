import BayitAuth
import BayitCore
import Foundation

// MARK: - Polling Fallback

extension TVQRAuthViewModel {
    /// Interval between status polls (seconds).
    static var pollingInterval: TimeInterval {
        5.0
    }

    /// Maximum number of poll attempts before giving up.
    /// 120 attempts * 5 seconds = 10 minutes, well within the 20-minute TTL.
    static var maxPollAttempts: Int {
        120
    }

    /// Starts a background polling loop that calls GET /status/{sessionId}
    /// every few seconds. Acts as a fallback when WebSocket messages are lost
    /// (e.g., due to multi-worker deployment or network issues).
    func startPolling(sessionId: String) {
        pollingTask?.cancel()

        let url = config.apiBaseURL
            .appendingPathComponent("auth/device-pairing/status/\(sessionId)")

        pollingTask = Task { [weak self] in
            var attempts = 0

            while !Task.isCancelled, attempts < Self.maxPollAttempts {
                try? await Task.sleep(for: .seconds(Self.pollingInterval))
                guard let self, !Task.isCancelled, !self.isTerminalStatus else { return }

                // Skip if WebSocket already delivered the update
                if self.wsDeliveredUpdate { return }

                attempts += 1

                do {
                    var request = URLRequest(url: url)
                    request.setValue(
                        "tvos", forHTTPHeaderField: "X-Client-Platform"
                    )
                    request.timeoutInterval = self.config.apiTimeout

                    let (data, response) = try await URLSession.shared.data(
                        for: request
                    )

                    guard let httpResponse = response as? HTTPURLResponse else { continue }

                    // 404 means session expired or was removed on the backend
                    if httpResponse.statusCode == 404 {
                        self.status = .expired
                        self.error = AuthError.sessionExpired.userFacingMessage
                        return
                    }

                    guard httpResponse.statusCode == 200 else { continue }

                    // Re-check after await in case WS delivered meanwhile
                    if self.wsDeliveredUpdate || self.isTerminalStatus { return }

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

    func handlePollResponse(_ poll: PollStatusResponse) {
        // Backend reports session already expired via flag
        if poll.isExpired {
            status = .expired
            error = AuthError.sessionExpired.userFacingMessage
            cleanup()
            return
        }

        switch poll.status {
        case "waiting":
            // Initial state -- no companion has scanned yet; keep polling
            break

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

    func handlePollSuccess(_ poll: PollStatusResponse) {
        guard let accessToken = poll.accessToken,
              let user = poll.user
        else {
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
                refreshToken: poll.refreshToken,
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
}
