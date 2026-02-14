@file:Suppress("unused")

package tv.bayit.plus.core.network

/**
 * Backward-compatibility alias. The canonical configuration class
 * is now [NetworkConfiguration], a data class with all fields required.
 *
 * This interface is retained only for existing callers that may reference it.
 * New code should use [NetworkConfiguration] directly.
 */
interface NetworkConfig {
    val baseUrl: String
    val webSocketBaseUrl: String
    val timeout: Long
    val maxRetries: Int
    val retryBaseDelay: Long
    val webSocketPingInterval: Long
    val webSocketMaxConnections: Int
}
