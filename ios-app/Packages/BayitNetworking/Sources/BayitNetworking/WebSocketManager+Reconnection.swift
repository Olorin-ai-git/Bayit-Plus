import Foundation

// MARK: - Reconnection with Exponential Backoff + Jitter

extension WebSocketManager {

    /// Attempts to reconnect all previously active connections.
    public func reconnectAll() async {
        let infos = reconnectInfo
        for (_, info) in infos {
            do {
                try await connect(to: info.url, authToken: info.authToken)
            } catch {
                logger.error("Reconnection failed", metadata: [
                    "url": info.url.absoluteString,
                    "error": error.localizedDescription
                ])
            }
        }
    }

    /// Attempts reconnection for a specific connection with exponential backoff and jitter.
    ///
    /// Delay formula: `baseDelay * 2^attempt + random(0 ... 25% of delay)`
    /// Gives up after `webSocketMaxReconnectAttempts` from configuration.
    public func reconnect(id: UUID) async {
        guard let info = reconnectInfo[id] else { return }

        let attempt = reconnectAttempts[id] ?? 0
        guard attempt < configuration.webSocketMaxReconnectAttempts else {
            logger.warning("Max reconnect attempts reached", metadata: [
                "connectionId": id.uuidString,
                "attempts": "\(attempt)"
            ])
            reconnectAttempts.removeValue(forKey: id)
            reconnectInfo.removeValue(forKey: id)
            return
        }

        let baseDelay = configuration.webSocketReconnectBaseDelay
        let exponentialDelay = baseDelay * pow(2.0, Double(attempt))
        let jitter = Double.random(in: 0...(exponentialDelay * 0.25))
        let totalDelay = exponentialDelay + jitter

        logger.info("Reconnecting with backoff", metadata: [
            "connectionId": id.uuidString,
            "attempt": "\(attempt + 1)",
            "delay": String(format: "%.2f", totalDelay)
        ])

        do {
            try await Task.sleep(nanoseconds: UInt64(totalDelay * 1_000_000_000))

            if let existing = connections[id] {
                await existing.disconnect()
                connections.removeValue(forKey: id)
            }

            reconnectAttempts[id] = attempt + 1
            try await connect(to: info.url, authToken: info.authToken)
            reconnectAttempts[id] = 0
        } catch {
            logger.error("Reconnect attempt failed", metadata: [
                "connectionId": id.uuidString,
                "attempt": "\(attempt + 1)",
                "error": error.localizedDescription
            ])
        }
    }
}
