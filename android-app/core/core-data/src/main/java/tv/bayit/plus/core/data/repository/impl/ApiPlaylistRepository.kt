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
import tv.bayit.plus.core.data.repository.PlaylistRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.model.PlaylistItem
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [PlaylistRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIPlaylistRepository and web api.js.
 */
class ApiPlaylistRepository(
    private val client: BayitApiClient,
) : PlaylistRepository {

    private val service: PlaylistService = client.createService()

    override suspend fun getPlaylists(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getPlaylists() }
            response.items
        }

    override suspend fun getPlaylist(playlistId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getPlaylist(playlistId) }
        }

    override suspend fun createPlaylist(name: String): BayitResult<Any> =
        runCatchingResult {
            val request = CreatePlaylistRequest(name = name)
            client.safeApiCall { service.createPlaylist(request) }
        }

    override suspend fun addToPlaylist(
        playlistId: String,
        mediaId: String,
    ): BayitResult<Unit> = runCatchingResult {
        val request = PlaylistMediaRequest(mediaId = mediaId)
        client.safeApiCall {
            service.addToPlaylist(playlistId, request)
        }
        Unit
    }

    override suspend fun removeFromPlaylist(
        playlistId: String,
        mediaId: String,
    ): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall {
            service.removeFromPlaylist(playlistId, mediaId)
        }
        Unit
    }

    override suspend fun deletePlaylist(playlistId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.deletePlaylist(playlistId) }
            Unit
        }
}

private interface PlaylistService {

    @GET("api/v1/playlists")
    suspend fun getPlaylists(): PlaylistListResponse

    @GET("api/v1/playlists/{id}")
    suspend fun getPlaylist(
        @Path("id") playlistId: String,
    ): PlaylistDetailResponse

    @POST("api/v1/playlists")
    suspend fun createPlaylist(
        @Body request: CreatePlaylistRequest,
    ): PlaylistDetailResponse

    @POST("api/v1/playlists/{id}/items")
    suspend fun addToPlaylist(
        @Path("id") playlistId: String,
        @Body request: PlaylistMediaRequest,
    ): MessageResponse

    @DELETE("api/v1/playlists/{id}/items/{mediaId}")
    suspend fun removeFromPlaylist(
        @Path("id") playlistId: String,
        @Path("mediaId") mediaId: String,
    ): MessageResponse

    @DELETE("api/v1/playlists/{id}")
    suspend fun deletePlaylist(
        @Path("id") playlistId: String,
    ): MessageResponse
}

/** List wrapper for playlists. */
@Serializable
private data class PlaylistListResponse(
    val items: List<PlaylistDetailResponse> = emptyList(),
)

/** Detail response for a single playlist. */
@Serializable
private data class PlaylistDetailResponse(
    val id: String,
    val name: String? = null,
    val description: String? = null,
    @SerialName("item_count") val itemCount: Int = 0,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    val items: List<PlaylistItem> = emptyList(),
)

/** Request body for creating a new playlist. */
@Serializable
private data class CreatePlaylistRequest(
    val name: String,
)

/** Request body for adding media to a playlist. */
@Serializable
private data class PlaylistMediaRequest(
    @SerialName("media_id") val mediaId: String,
)
