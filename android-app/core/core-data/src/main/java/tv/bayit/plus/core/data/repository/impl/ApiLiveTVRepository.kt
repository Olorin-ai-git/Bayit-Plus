package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.LiveTVRepository
import tv.bayit.plus.core.model.ChannelDetail
import tv.bayit.plus.core.model.ChannelEPGResponse
import tv.bayit.plus.core.model.ChannelsResponse
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.core.model.LiveStreamResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [LiveTVRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APILiveTVRepository and web api.js.
 */
class ApiLiveTVRepository(
    private val client: BayitApiClient,
) : LiveTVRepository {

    private val service: LiveTVService = client.createService()

    override suspend fun getChannels(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getChannels() }
        response.channels
    }

    override suspend fun getChannel(channelId: String): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getChannelDetail(channelId) }
    }

    override suspend fun getStreamUrl(channelId: String): BayitResult<String> =
        runCatchingResult {
            val response = client.safeApiCall { service.getStreamUrl(channelId) }
            response.resolvedUrl
                ?: throw IllegalStateException("No stream URL available for channel $channelId")
        }

    override suspend fun getCurrentProgram(channelId: String): BayitResult<Any> =
        runCatchingResult {
            val epg = client.safeApiCall { service.getChannelEPG(channelId) }
            epg.entries.firstOrNull { it.isNow == true }
                ?: throw IllegalStateException("No current program for channel $channelId")
        }

    override suspend fun getChannelsByCategory(category: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getChannelsByCategory(category)
            }
            response.channels
        }
}

private interface LiveTVService {

    @GET("api/v1/live/channels")
    suspend fun getChannels(): ChannelsResponse

    @GET("api/v1/live/{channelId}")
    suspend fun getChannelDetail(
        @Path("channelId") channelId: String,
    ): ChannelDetail

    @GET("api/v1/live/{channelId}/stream")
    suspend fun getStreamUrl(
        @Path("channelId") channelId: String,
    ): LiveStreamResponse

    @GET("api/v1/live/{channelId}/epg")
    suspend fun getChannelEPG(
        @Path("channelId") channelId: String,
    ): ChannelEPGResponse

    @GET("api/v1/live/channels")
    suspend fun getChannelsByCategory(
        @Query("category") category: String,
    ): ChannelsResponse
}
