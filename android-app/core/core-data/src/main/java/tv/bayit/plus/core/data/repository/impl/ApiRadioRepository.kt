package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.RadioRepository
import tv.bayit.plus.core.model.RadioStationDetail
import tv.bayit.plus.core.model.RadioStreamResponse
import tv.bayit.plus.core.model.StationsResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [RadioRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIRadioRepository and web api.js.
 */
class ApiRadioRepository(
    private val client: BayitApiClient,
) : RadioRepository {

    private val service: RadioService = client.createService()

    override suspend fun getStations(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getStations() }
        response.stations
    }

    override suspend fun getStation(stationId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getStationDetail(stationId) }
        }

    override suspend fun getStreamUrl(stationId: String): BayitResult<String> =
        runCatchingResult {
            val response = client.safeApiCall { service.getStreamUrl(stationId) }
            response.url
        }

    override suspend fun getNowPlaying(stationId: String): BayitResult<Any> =
        runCatchingResult {
            val detail = client.safeApiCall { service.getStationDetail(stationId) }
            NowPlayingInfo(
                currentShow = detail.currentShow,
                currentSong = detail.currentSong,
            )
        }

    override suspend fun getFavoriteStations(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getFavoriteStations() }
        response.stations
    }

    override suspend fun toggleFavorite(stationId: String): BayitResult<Boolean> =
        runCatchingResult {
            val response = client.safeApiCall { service.toggleFavorite(stationId) }
            response.isFavorited
        }
}

private interface RadioService {

    @GET("api/v1/radio/stations")
    suspend fun getStations(): StationsResponse

    @GET("api/v1/radio/{stationId}")
    suspend fun getStationDetail(
        @Path("stationId") stationId: String,
    ): RadioStationDetail

    @GET("api/v1/radio/{stationId}/stream")
    suspend fun getStreamUrl(
        @Path("stationId") stationId: String,
    ): RadioStreamResponse

    @GET("api/v1/radio/favorites")
    suspend fun getFavoriteStations(): StationsResponse

    @POST("api/v1/radio/{stationId}/favorite")
    suspend fun toggleFavorite(
        @Path("stationId") stationId: String,
    ): FavoriteToggleResult
}

/** Response from the toggle-favorite endpoint for radio stations. */
@Serializable
private data class FavoriteToggleResult(
    val isFavorited: Boolean,
)

/** Extracted now-playing info returned from the station detail. */
@Serializable
private data class NowPlayingInfo(
    val currentShow: String? = null,
    val currentSong: String? = null,
)
