import Foundation

/// Protocol defining all configurable values for the networking layer.
///
/// No defaults are provided -- the host app MUST supply every value
/// from its configuration system (Info.plist, environment, remote config).
public protocol NetworkConfiguration: Sendable {
    /// Base URL for all API requests (e.g. `https://api.bayit.tv/api/v1`).
    var baseURL: URL { get }

    /// URLSession timeout interval for each request, in seconds.
    var timeout: TimeInterval { get }

    /// Maximum number of automatic retries for retryable failures.
    var maxRetries: Int { get }

    /// Base delay in seconds for the first retry. Subsequent retries
    /// use exponential back-off: `retryBaseDelay * 2^retryCount`.
    var retryBaseDelay: TimeInterval { get }

    /// HTTP status codes that are eligible for automatic retry.
    /// Matches the web api.js set: 408, 429, 500, 502, 503, 504.
    var retryableStatusCodes: Set<Int> { get }

    /// Default HTTP headers appended to every request.
    /// Content-Type is always set to `application/json` by the client,
    /// but additional static headers can be injected here.
    var defaultHeaders: [String: String] { get }

    // MARK: - WebSocket Configuration

    /// Maximum number of concurrent WebSocket connections allowed.
    var webSocketMaxConcurrentConnections: Int { get }

    /// Interval in seconds between WebSocket ping/keepalive messages.
    var webSocketPingInterval: TimeInterval { get }

    /// Maximum number of reconnection attempts before giving up.
    var webSocketMaxReconnectAttempts: Int { get }

    /// Base delay in seconds for WebSocket reconnection backoff.
    var webSocketReconnectBaseDelay: TimeInterval { get }

    /// Grace period in seconds before disconnecting WebSockets when app becomes inactive.
    var webSocketInactiveGracePeriod: TimeInterval { get }

    /// Base URL for WebSocket connections (e.g. `wss://ws.bayit.tv`).
    var webSocketBaseURL: URL { get }
}
