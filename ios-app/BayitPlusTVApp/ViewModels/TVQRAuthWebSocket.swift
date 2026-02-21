import BayitAuth
import BayitCore
import Foundation

// MARK: - WebSocket Connection & Message Handling

extension TVQRAuthViewModel {
    func connectWebSocket(sessionId: String) {
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

    func listenForMessages() {
        guard !isTerminalStatus else { return }

        webSocketTask?.receive { [weak self] result in
            Task { @MainActor [weak self] in
                guard let self, !self.isTerminalStatus else { return }

                switch result {
                case let .success(message):
                    self.handleWebSocketMessage(message)
                    if !self.isTerminalStatus {
                        self.listenForMessages()
                    }

                case let .failure(wsError):
                    self.logger.warning(
                        "WebSocket disconnected; polling fallback active",
                        metadata: ["error": wsError.localizedDescription]
                    )
                }
            }
        }
    }

    // MARK: - WebSocket Keepalive

    /// Interval between WebSocket pings (seconds).
    static var pingInterval: TimeInterval {
        15.0
    }

    /// Sends periodic ping messages to keep the WebSocket connection alive
    /// and detect dead connections early.
    func startPing() {
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
                }
            }
        }
    }
}
