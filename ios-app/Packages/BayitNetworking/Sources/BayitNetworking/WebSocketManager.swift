import Foundation

/// Centralized actor-based WebSocket manager for all real-time connections.
///
/// Manages a shared URLSession, auth-message handshake, ping/keepalive,
/// and max concurrent connection limits. Reconnection logic lives in
/// `WebSocketManager+Reconnection.swift`.
/// All social features (DMs, Watch Parties, Chess) route through this manager.
public actor WebSocketManager {
    // MARK: - Dependencies

    public let configuration: NetworkConfiguration
    public let logger: APILogger
    private let session: URLSession
    let authTokenProvider: AuthTokenProvider?

    // MARK: - State

    var connections: [UUID: WebSocketConnection] = [:]
    var pingTask: Task<Void, Never>?
    var reconnectAttempts: [UUID: Int] = [:]
    var reconnectInfo: [UUID: ReconnectInfo] = [:]

    struct ReconnectInfo: Sendable {
        let url: URL
    }

    // MARK: - Init

    public init(
        configuration: NetworkConfiguration,
        logger: APILogger,
        authTokenProvider: AuthTokenProvider? = nil
    ) {
        self.configuration = configuration
        self.logger = logger
        self.authTokenProvider = authTokenProvider

        let sessionConfig = URLSessionConfiguration.default
        // WebSocket connections are long-lived -- don't apply the short HTTP
        // request timeout.  The ping/keepalive timer handles liveness instead.
        // timeoutIntervalForResource (default 7 days) remains appropriate.
        session = URLSession(configuration: sessionConfig)
    }

    // MARK: - Public API

    /// Opens a WebSocket to the given URL with auth-message handshake.
    ///
    /// After the TCP connection opens, sends `{"type":"auth","token":"..."}` as
    /// the first message, matching the backend's auth-message pattern.
    @discardableResult
    public func connect(to url: URL, authToken: String) async throws -> WebSocketConnection {
        guard connections.count < configuration.webSocketMaxConcurrentConnections else {
            logger.warning("Max concurrent WebSocket connections reached", metadata: [
                "limit": "\(configuration.webSocketMaxConcurrentConnections)",
                "active": "\(connections.count)",
            ])
            throw APIError.unknown(
                statusCode: nil,
                message: "Max concurrent WebSocket connections reached"
            )
        }

        let connectionId = UUID()
        let task = session.webSocketTask(with: url)
        let connection = WebSocketConnection(
            id: connectionId, url: url, task: task, logger: logger
        )
        connections[connectionId] = connection
        reconnectInfo[connectionId] = ReconnectInfo(url: url)
        reconnectAttempts[connectionId] = 0

        task.resume()

        let authPayload = "{\"type\":\"auth\",\"token\":\"\(authToken)\"}"
        try await connection.sendRaw(message: authPayload)
        await connection.didAuthenticate()

        logger.info("WebSocket connected with auth handshake", metadata: [
            "connectionId": connectionId.uuidString,
            "url": url.absoluteString,
            "activeConnections": "\(connections.count)",
        ])

        startPingTimerIfNeeded()
        return connection
    }

    /// Disconnects a specific connection by ID.
    public func disconnect(id: UUID) async {
        guard let connection = connections.removeValue(forKey: id) else { return }
        await connection.disconnect()
        reconnectAttempts.removeValue(forKey: id)
        reconnectInfo.removeValue(forKey: id)

        logger.info("WebSocket removed", metadata: [
            "connectionId": id.uuidString,
            "remaining": "\(connections.count)",
        ])
        stopPingTimerIfIdle()
    }

    /// Disconnects all active WebSocket connections.
    public func disconnectAll() async {
        let allConnections = connections
        connections.removeAll()
        reconnectAttempts.removeAll()
        reconnectInfo.removeAll()

        for (_, connection) in allConnections {
            await connection.disconnect()
        }
        stopPingTimerIfIdle()
        logger.info("All WebSocket connections disconnected")
    }

    /// Number of currently tracked connections.
    public var activeConnectionCount: Int {
        connections.count
    }

    // MARK: - Ping / Keepalive

    func startPingTimerIfNeeded() {
        guard pingTask == nil, !connections.isEmpty else { return }
        let interval = configuration.webSocketPingInterval

        pingTask = Task { [weak self] in
            while !Task.isCancelled {
                do {
                    try await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
                } catch { break }
                await self?.sendPingToAll()
            }
        }
    }

    func stopPingTimerIfIdle() {
        guard connections.isEmpty else { return }
        pingTask?.cancel()
        pingTask = nil
    }

    private func sendPingToAll() async {
        for (id, connection) in connections {
            do {
                try await connection.sendRaw(message: "{\"type\":\"ping\"}")
            } catch {
                logger.warning("Ping failed, scheduling reconnect", metadata: [
                    "connectionId": id.uuidString,
                ])
                await reconnect(id: id)
            }
        }
    }
}
