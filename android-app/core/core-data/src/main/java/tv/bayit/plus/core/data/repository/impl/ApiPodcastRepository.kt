package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.PodcastRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.model.PodcastDetail
import tv.bayit.plus.core.model.PodcastEpisodesResponse
import tv.bayit.plus.core.model.PodcastsResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [PodcastRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIPodcastRepository and web api.js.
 */
class ApiPodcastRepository(
    private val client: BayitApiClient,
) : PodcastRepository {

    private val service: PodcastService = client.createService()

    override suspend fun getPodcasts(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getPodcasts() }
        response.shows
    }

    override suspend fun getPodcast(podcastId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getPodcastDetail(podcastId) }
        }

    override suspend fun getEpisodes(podcastId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getEpisodes(podcastId)
            }
            response.episodes
        }

    override suspend fun getEpisode(episodeId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getEpisode(episodeId) }
        }

    override suspend fun getSubscriptions(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getSubscriptions() }
        response.shows
    }

    override suspend fun subscribe(podcastId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.subscribe(podcastId) }
            Unit
        }

    override suspend fun unsubscribe(podcastId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.unsubscribe(podcastId) }
            Unit
        }
}

private interface PodcastService {

    @GET("api/v1/podcasts")
    suspend fun getPodcasts(): PodcastsResponse

    @GET("api/v1/podcasts/{podcastId}")
    suspend fun getPodcastDetail(
        @Path("podcastId") podcastId: String,
    ): PodcastDetail

    @GET("api/v1/podcasts/{podcastId}/episodes")
    suspend fun getEpisodes(
        @Path("podcastId") podcastId: String,
    ): PodcastEpisodesResponse

    @GET("api/v1/podcasts/episodes/{episodeId}")
    suspend fun getEpisode(
        @Path("episodeId") episodeId: String,
    ): tv.bayit.plus.core.model.PodcastEpisodeItem

    @GET("api/v1/podcasts/subscriptions")
    suspend fun getSubscriptions(): PodcastsResponse

    @POST("api/v1/podcasts/{podcastId}/subscribe")
    suspend fun subscribe(
        @Path("podcastId") podcastId: String,
    ): MessageResponse

    @DELETE("api/v1/podcasts/subscriptions/{podcastId}")
    suspend fun unsubscribe(
        @Path("podcastId") podcastId: String,
    ): MessageResponse
}
