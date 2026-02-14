@file:Suppress("unused")

package tv.bayit.plus.core.network

/**
 * Type alias preserving backward compatibility for callers that imported
 * [BayitApiClient] from the root network package. The canonical implementation
 * now lives in [tv.bayit.plus.core.network.api.BayitApiClient].
 */
typealias BayitApiClient = tv.bayit.plus.core.network.api.BayitApiClient
