package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.GrandparentBridgeRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [GrandparentBridgeRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIGrandparentBridgeRepository and web api.js.
 */
class ApiGrandparentBridgeRepository(
    private val client: BayitApiClient,
) : GrandparentBridgeRepository {

    private val service: GrandparentBridgeService = client.createService()

    override suspend fun getSimplifiedInterface(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getSimplifiedInterface() }
        }

    override suspend fun getBridgeConnections(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getConnections() }
            response.connections
        }

    override suspend fun createBridgeInvite(grandparentName: String): BayitResult<String> =
        runCatchingResult {
            val request = BridgeInviteRequest(name = grandparentName)
            val response = client.safeApiCall {
                service.createInvite(request)
            }
            response.inviteCode
                ?: throw IllegalStateException("No invite code returned from bridge invite")
        }

    override suspend fun acceptBridgeInvite(inviteCode: String): BayitResult<Any> =
        runCatchingResult {
            val request = BridgeAcceptRequest(inviteCode = inviteCode)
            client.safeApiCall { service.acceptInvite(request) }
        }

    override suspend fun getSharedContent(connectionId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getSharedContent(connectionId)
            }
            response.items
        }

    override suspend fun shareContent(
        connectionId: String,
        mediaId: String,
        message: String?,
    ): BayitResult<Unit> = runCatchingResult {
        val request = BridgeShareRequest(
            mediaId = mediaId,
            message = message,
        )
        client.safeApiCall {
            service.shareContent(connectionId, request)
        }
        Unit
    }
}

private interface GrandparentBridgeService {

    @GET("api/v1/bridge/simplified")
    suspend fun getSimplifiedInterface(): SimplifiedInterfaceResponse

    @GET("api/v1/bridge/connections")
    suspend fun getConnections(): BridgeConnectionsResponse

    @POST("api/v1/bridge/invite")
    suspend fun createInvite(
        @Body request: BridgeInviteRequest,
    ): BridgeInviteResponse

    @POST("api/v1/bridge/accept")
    suspend fun acceptInvite(
        @Body request: BridgeAcceptRequest,
    ): BridgeConnectionDetail

    @GET("api/v1/bridge/{id}/shared")
    suspend fun getSharedContent(
        @Path("id") connectionId: String,
    ): BridgeSharedContentResponse

    @POST("api/v1/bridge/{id}/share")
    suspend fun shareContent(
        @Path("id") connectionId: String,
        @Body request: BridgeShareRequest,
    ): MessageResponse
}

/** Simplified UI configuration for grandparent users. */
@Serializable
private data class SimplifiedInterfaceResponse(
    @SerialName("font_scale") val fontScale: Double = 1.0,
    @SerialName("high_contrast") val highContrast: Boolean = false,
    @SerialName("simplified_nav") val simplifiedNav: Boolean = true,
    @SerialName("large_buttons") val largeButtons: Boolean = true,
    val categories: List<SimplifiedCategory> = emptyList(),
)

/** A simplified navigation category for the bridge interface. */
@Serializable
private data class SimplifiedCategory(
    val id: String,
    val label: String? = null,
    @SerialName("icon_url") val iconUrl: String? = null,
    @SerialName("content_count") val contentCount: Int = 0,
)

/** List wrapper for bridge connections. */
@Serializable
private data class BridgeConnectionsResponse(
    val connections: List<BridgeConnectionDetail> = emptyList(),
)

/** Detail of a single grandparent-family bridge connection. */
@Serializable
private data class BridgeConnectionDetail(
    val id: String,
    val name: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val status: String? = null,
    @SerialName("connected_at") val connectedAt: String? = null,
    @SerialName("shared_count") val sharedCount: Int = 0,
)

/** Request body for creating a bridge invite. */
@Serializable
private data class BridgeInviteRequest(
    val name: String,
)

/** Response from creating a bridge invite. */
@Serializable
private data class BridgeInviteResponse(
    @SerialName("invite_code") val inviteCode: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
)

/** Request body for accepting a bridge invite. */
@Serializable
private data class BridgeAcceptRequest(
    @SerialName("invite_code") val inviteCode: String,
)

/** List wrapper for shared content. */
@Serializable
private data class BridgeSharedContentResponse(
    val items: List<BridgeSharedItem> = emptyList(),
)

/** A single piece of shared content within a bridge connection. */
@Serializable
private data class BridgeSharedItem(
    val id: String,
    @SerialName("media_id") val mediaId: String? = null,
    val title: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    val message: String? = null,
    @SerialName("shared_by") val sharedBy: String? = null,
    @SerialName("shared_at") val sharedAt: String? = null,
)

/** Request body for sharing content with a bridge connection. */
@Serializable
private data class BridgeShareRequest(
    @SerialName("media_id") val mediaId: String,
    val message: String? = null,
)
