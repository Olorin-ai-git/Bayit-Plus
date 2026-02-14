package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.SeriesRepository
import tv.bayit.plus.core.model.SeasonEpisodesResponse
import tv.bayit.plus.core.model.SeasonSummary
import tv.bayit.plus.core.model.SeriesDetail
import tv.bayit.plus.core.model.SeriesListResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [SeriesRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APISeriesRepository and web api.js.
 */
class ApiSeriesRepository(
    private val client: BayitApiClient,
) : SeriesRepository {

    private val service: SeriesService = client.createService()

    override suspend fun getSeries(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getAllSeries() }
        response.items
    }

    override suspend fun getSeriesById(seriesId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getSeriesDetail(seriesId) }
        }

    override suspend fun getSeasons(seriesId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val detail = client.safeApiCall { service.getSeriesDetail(seriesId) }
            detail.seasons ?: emptyList()
        }

    override suspend fun getEpisodes(
        seriesId: String,
        seasonNumber: Int,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getSeasonEpisodes(seriesId, seasonNumber)
        }
        response.episodes
    }

    override suspend fun getNextEpisode(seriesId: String): BayitResult<Any> =
        runCatchingResult {
            val detail = client.safeApiCall { service.getSeriesDetail(seriesId) }
            val firstSeason = detail.seasons?.firstOrNull()
                ?: throw IllegalStateException("No seasons available for series $seriesId")
            val episodes = client.safeApiCall {
                service.getSeasonEpisodes(seriesId, firstSeason.seasonNumber)
            }
            episodes.episodes.firstOrNull()
                ?: throw IllegalStateException("No episodes available for series $seriesId")
        }
}

private interface SeriesService {

    @GET("api/v1/content/series")
    suspend fun getAllSeries(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50,
    ): SeriesListResponse

    @GET("api/v1/content/series/{seriesId}")
    suspend fun getSeriesDetail(
        @Path("seriesId") seriesId: String,
    ): SeriesDetail

    @GET("api/v1/content/series/{seriesId}/season/{seasonNumber}/episodes")
    suspend fun getSeasonEpisodes(
        @Path("seriesId") seriesId: String,
        @Path("seasonNumber") seasonNumber: Int,
    ): SeasonEpisodesResponse
}
