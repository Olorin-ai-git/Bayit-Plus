import Foundation

/// Represents a single WebSocket connection with message streaming.
///
/// Lifecycle is managed by `WebSocketManager`. Callers interact with
/// this type to send messages and receive an `AsyncStream` of incoming data.
public actor WebSocketConnection {

    // MARK: - Types

    public enum State: Sendable {
        case connecting
        case connected
        case disconnected
    }

    // MARK: - Properties

    public let id: UUID
    public let url: URL
    public private(set) var state: State

    private var webSocketTask: URLSessionWebSocketTask?
    private var messageContinuation: AsyncStream<String>.Continuation?
    private let logger: APILogger

    // MARK: - Init

    init(id: UUID, url: URL, task: URLSessionWebSocketTask, logger: APILogger) {
        self.id = id
        self.url = url
        self.webSocketTask = task
        self.state = .connecting
        self.logger = logger
    }

    // MARK: - Public API

    /// Marks the connection as connected after successful auth handshake.
    func didAuthenticate() {
        state = .connected
        logger.debug("WebSocket authenticated", metadata: [
            "connectionId": id.uuidString,
            "url": url.absoluteString
        ])
    }

    /// Sends a text message over the WebSocket.
    public func send(message: String) async throws {
        guard let task = webSocketTask, state == .connected else {
            throw APIError.networkError(underlying: "WebSocket not connected")
        }
        try await task.send(.string(message))
    }

    /// Returns an `AsyncStream` of incoming text messages.
    public func receive() -> AsyncStream<String> {
        let (stream, continuation) = AsyncStream<String>.makeStream()
        self.messageContinuation = continuation

        continuation.onTermination = { @Sendable _ in
            Task { await self.handleStreamTermination() }
        }

        Task { await self.receiveLoop() }
        return stream
    }

    /// Disconnects the WebSocket with a normal closure.
    public func disconnect() {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        state = .disconnected
        messageContinuation?.finish()
        messageContinuation = nil
        logger.info("WebSocket disconnected", metadata: [
            "connectionId": id.uuidString
        ])
    }

    // MARK: - Internal

    /// Sends a raw message bypassing the connected-state check.
    /// Used by `WebSocketManager` to send the auth handshake while still connecting.
    func sendRaw(message: String) async throws {
        guard let task = webSocketTask else {
            throw APIError.networkError(underlying: "WebSocket task unavailable")
        }
        try await task.send(.string(message))
    }

    // MARK: - Private

    private func receiveLoop() async {
        guard let task = webSocketTask else { return }
        do {
            while state != .disconnected {
                let message = try await task.receive()
                switch message {
                case .string(let text):
                    messageContinuation?.yield(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        messageContinuation?.yield(text)
                    }
                @unknown default:
                    break
                }
            }
        } catch {
            if state != .disconnected {
                state = .disconnected
                logger.error("WebSocket receive error", metadata: [
                    "connectionId": id.uuidString,
                    "error": error.localizedDescription
                ])
            }
            messageContinuation?.finish()
            messageContinuation = nil
        }
    }

    private func handleStreamTermination() {
        if state != .disconnected {
            disconnect()
        }
    }
}
