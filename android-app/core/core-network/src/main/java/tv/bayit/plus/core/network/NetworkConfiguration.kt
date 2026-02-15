package tv.bayit.plus.core.network

import kotlin.time.Duration

/**
 * Configuration for the Bayit+ networking layer.
 *
 * All values are injected from the host application's configuration system
 * (BuildConfig, remote config, etc.) -- no defaults are embedded here.
 *
 * Mirrors the iOS [NetworkConfiguration] protocol from BayitNetworking.
 *
 * Implements [NetworkConfig] for backward compatibility.
 */
data class NetworkConfiguration(
    /** Base URL for all API requests (e.g. "https://api.bayit.tv/api/v1"). */
    val baseUrl: String,

    /** Base URL for WebSocket connections (e.g. "wss://api.bayit.tv/ws"). */
    val webSocketBaseUrl: String,

    /** Timeout for connect, read, and write operations. */
    val timeout: Duration,

    /** Maximum number of automatic retries for retryable failures. */
    val maxRetries: Int,

    /** Base delay for the first retry. Subsequent retries use exponential backoff. */
    val retryBaseDelay: Duration,

    /**
     * HTTP status codes eligible for automatic retry.
     * Matches the web api.js set: 408, 429, 500, 502, 503, 504.
     */
    val retryableStatusCodes: Set<Int>,

    /** Maximum number of concurrent WebSocket connections allowed. */
    val webSocketMaxConcurrentConnections: Int,

    /** Interval between WebSocket ping/keepalive messages. */
    val webSocketPingInterval: Duration,

    /** Maximum number of WebSocket reconnection attempts before giving up. */
    val webSocketMaxReconnectAttempts: Int,

    /** Base delay for WebSocket reconnection backoff. */
    val webSocketReconnectBaseDelay: Duration,
) : NetworkConfig {

    /** Timeout in milliseconds for OkHttp configuration. */
    val timeoutMillis: Long get() = timeout.inWholeMilliseconds

    /** Retry base delay in milliseconds for interceptor calculations. */
    val retryBaseDelayMillis: Long get() = retryBaseDelay.inWholeMilliseconds

    /** WebSocket ping interval in seconds for OkHttp configuration. */
    val webSocketPingIntervalSeconds: Long get() = webSocketPingInterval.inWholeSeconds

    // NetworkConfig interface implementations (backward compatibility)
    override val timeout: Long get() = timeoutMillis
    override val retryBaseDelay: Long get() = retryBaseDelayMillis
    override val webSocketPingInterval: Long get() = webSocketPingIntervalSeconds
    override val webSocketMaxConnections: Int get() = webSocketMaxConcurrentConnections
}
