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
        client.safeApiCall { service.addToPlaylist(request) }
        Unit
    }

    override suspend fun removeFromPlaylist(
        playlistId: String,
        mediaId: String,
    ): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall { service.removeFromPlaylist(mediaId) }
        Unit
    }

    override suspend fun deletePlaylist(playlistId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.deletePlaylist() }
            Unit
        }
}

private interface PlaylistService {

    @GET("api/v1/playlist")
    suspend fun getPlaylists(): PlaylistListResponse

    @GET("api/v1/playlist/check/{id}")
    suspend fun getPlaylist(
        @Path("id") playlistId: String,
    ): PlaylistListResponse

    @POST("api/v1/playlist/items")
    suspend fun createPlaylist(
        @Body request: CreatePlaylistRequest,
    ): PlaylistListResponse

    @POST("api/v1/playlist/items")
    suspend fun addToPlaylist(
        @Body request: PlaylistMediaRequest,
    ): MessageResponse

    @DELETE("api/v1/playlist/items/{contentId}")
    suspend fun removeFromPlaylist(
        @Path("contentId") contentId: String,
    ): MessageResponse

    @DELETE("api/v1/playlist")
    suspend fun deletePlaylist(): MessageResponse
}

/** List wrapper matching backend GET /api/v1/playlist response. */
@Serializable
private data class PlaylistListResponse(
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
