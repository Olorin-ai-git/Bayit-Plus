package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.FamilySnapRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [FamilySnapRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIFamilySnapRepository and web api.js.
 */
class ApiFamilySnapRepository(
    private val client: BayitApiClient,
) : FamilySnapRepository {

    private val service: FamilySnapService = client.createService()

    override suspend fun getSnapFeed(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getSnaps() }
            response.items
        }

    override suspend fun createSnap(
        mediaId: String,
        timestampMs: Long,
        caption: String?,
    ): BayitResult<Any> = runCatchingResult {
        val request = CreateSnapRequest(
            mediaId = mediaId,
            timestampMs = timestampMs,
            caption = caption,
        )
        client.safeApiCall { service.createSnap(request) }
    }

    override suspend fun deleteSnap(snapId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.deleteSnap(snapId) }
            Unit
        }

    override suspend fun reactToSnap(snapId: String, reaction: String): BayitResult<Unit> =
        runCatchingResult {
            val request = SnapReactionRequest(reaction = reaction)
            client.safeApiCall { service.reactToSnap(snapId, request) }
            Unit
        }

    override suspend fun getSnapsByMember(memberId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getSnapsByMember(memberId)
            }
            response.items
        }
}

private interface FamilySnapService {

    @GET("api/v1/family/snaps")
    suspend fun getSnaps(): SnapListResponse

    @POST("api/v1/family/snap")
    suspend fun createSnap(@Body request: CreateSnapRequest): SnapDetailResponse

    @DELETE("api/v1/family/snap/{id}")
    suspend fun deleteSnap(@Path("id") snapId: String): MessageResponse

    @POST("api/v1/family/snap/{id}/react")
    suspend fun reactToSnap(
        @Path("id") snapId: String,
        @Body request: SnapReactionRequest,
    ): MessageResponse

    @GET("api/v1/family/snaps/member/{id}")
    suspend fun getSnapsByMember(
        @Path("id") memberId: String,
    ): SnapListResponse
}

/** List wrapper for snap feed endpoints. */
@Serializable
private data class SnapListResponse(
    val items: List<SnapDetailResponse> = emptyList(),
)

/** Detail response for a single family snap. */
@Serializable
private data class SnapDetailResponse(
    val id: String,
    @SerialName("media_id") val mediaId: String? = null,
    @SerialName("timestamp_ms") val timestampMs: Long? = null,
    val caption: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("created_by") val createdBy: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    val reactions: List<SnapReaction> = emptyList(),
)

/** A reaction on a family snap. */
@Serializable
private data class SnapReaction(
    @SerialName("user_id") val userId: String,
    val reaction: String,
    @SerialName("reacted_at") val reactedAt: String? = null,
)

/** Request body for creating a new snap. */
@Serializable
private data class CreateSnapRequest(
    @SerialName("media_id") val mediaId: String,
    @SerialName("timestamp_ms") val timestampMs: Long,
    val caption: String? = null,
)

/** Request body for reacting to a snap. */
@Serializable
private data class SnapReactionRequest(
    val reaction: String,
)
