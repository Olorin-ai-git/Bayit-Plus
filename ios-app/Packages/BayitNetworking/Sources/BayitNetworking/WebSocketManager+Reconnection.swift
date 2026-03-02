import Foundation

// MARK: - Reconnection with Exponential Backoff + Jitter

public extension WebSocketManager {
    /// Attempts to reconnect all previously active connections using fresh auth tokens.
    func reconnectAll() async {
        let infos = reconnectInfo
        for (id, info) in infos {
            guard let token = await freshToken(for: id) else { continue }
            do {
                try await connect(to: info.url, authToken: token)
            } catch {
                logger.error("Reconnection failed", metadata: [
                    "url": info.url.absoluteString,
                    "error": error.localizedDescription,
                ])
            }
        }
    }

    /// Attempts reconnection for a specific connection with exponential backoff and jitter.
    ///
    /// Fetches a fresh auth token before each attempt to avoid "Signature has expired" loops.
    /// Delay formula: `baseDelay * 2^attempt + random(0 ... 25% of delay)`
    /// Gives up after `webSocketMaxReconnectAttempts` from configuration.
    func reconnect(id: UUID) async {
        guard let info = reconnectInfo[id] else { return }

        let attempt = reconnectAttempts[id] ?? 0
        guard attempt < configuration.webSocketMaxReconnectAttempts else {
            logger.warning("Max reconnect attempts reached", metadata: [
                "connectionId": id.uuidString,
                "attempts": "\(attempt)",
            ])
            reconnectAttempts.removeValue(forKey: id)
            reconnectInfo.removeValue(forKey: id)
            return
        }

        let baseDelay = configuration.webSocketReconnectBaseDelay
        let exponentialDelay = baseDelay * pow(2.0, Double(attempt))
        let jitter = Double.random(in: 0 ... (exponentialDelay * 0.25))
        let totalDelay = exponentialDelay + jitter

        logger.info("Reconnecting with backoff", metadata: [
            "connectionId": id.uuidString,
            "attempt": "\(attempt + 1)",
            "delay": String(format: "%.2f", totalDelay),
        ])

        do {
            try await Task.sleep(nanoseconds: UInt64(totalDelay * 1_000_000_000))

            guard let token = await freshToken(for: id) else { return }

            if let existing = connections[id] {
                await existing.disconnect()
                connections.removeValue(forKey: id)
            }

            reconnectAttempts[id] = attempt + 1
            try await connect(to: info.url, authToken: token)
            reconnectAttempts[id] = 0
        } catch {
            logger.error("Reconnect attempt failed", metadata: [
                "connectionId": id.uuidString,
                "attempt": "\(attempt + 1)",
                "error": error.localizedDescription,
            ])
        }
    }

    /// Fetches a fresh auth token from the provider. Logs and returns nil on failure.
    internal func freshToken(for connectionId: UUID) async -> String? {
        guard let provider = authTokenProvider else {
            logger.warning("No auth token provider for reconnect", metadata: [
                "connectionId": connectionId.uuidString,
            ])
            reconnectAttempts.removeValue(forKey: connectionId)
            reconnectInfo.removeValue(forKey: connectionId)
            return nil
        }

        do {
            guard let token = try await provider.currentToken() else {
                logger.warning("Auth token provider returned nil", metadata: [
                    "connectionId": connectionId.uuidString,
                ])
                return nil
            }
            return token
        } catch {
            logger.error("Failed to fetch fresh auth token", metadata: [
                "connectionId": connectionId.uuidString,
                "error": error.localizedDescription,
            ])
            return nil
        }
    }
}
