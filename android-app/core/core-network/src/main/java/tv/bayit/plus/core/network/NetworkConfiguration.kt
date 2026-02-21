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
    override val baseUrl: String,

    /** Base URL for WebSocket connections (e.g. "wss://ws.bayit.tv"). */
    override val webSocketBaseUrl: String,

    /** Timeout for connect, read, and write operations. */
    val timeoutDuration: Duration,

    /** Maximum number of automatic retries for retryable failures. */
    override val maxRetries: Int,

    /** Base delay for the first retry. Subsequent retries use exponential backoff. */
    val retryBaseDelayDuration: Duration,

    /**
     * HTTP status codes eligible for automatic retry.
     * Matches the web api.js set: 408, 429, 500, 502, 503, 504.
     */
    val retryableStatusCodes: Set<Int>,

    /** Maximum number of concurrent WebSocket connections allowed. */
    override val webSocketMaxConnections: Int,

    /** Interval between WebSocket ping/keepalive messages. */
    val webSocketPingIntervalDuration: Duration,

    /** Maximum number of WebSocket reconnection attempts before giving up. */
    val webSocketMaxReconnectAttempts: Int,

    /** Base delay for WebSocket reconnection backoff. */
    val webSocketReconnectBaseDelay: Duration,

    /** Whether the app is in debug mode. Controls HTTP logging verbosity. */
    val isDebug: Boolean,
) : NetworkConfig {

    /** Timeout in milliseconds for OkHttp configuration. */
    val timeoutMillis: Long get() = timeoutDuration.inWholeMilliseconds

    /** Retry base delay in milliseconds for interceptor calculations. */
    val retryBaseDelayMillis: Long get() = retryBaseDelayDuration.inWholeMilliseconds

    /** WebSocket ping interval in seconds for OkHttp configuration. */
    val webSocketPingIntervalSeconds: Long get() = webSocketPingIntervalDuration.inWholeSeconds

    // NetworkConfig interface implementations (backward compatibility)
    override val timeout: Long get() = timeoutMillis
    override val retryBaseDelay: Long get() = retryBaseDelayMillis
    override val webSocketPingInterval: Long get() = webSocketPingIntervalSeconds
}
