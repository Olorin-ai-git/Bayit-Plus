package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.CatchupRepository
import tv.bayit.plus.core.model.CatchUpAvailabilityResponse
import tv.bayit.plus.core.model.CatchUpSummaryResponse
import tv.bayit.plus.core.model.TranscriptStatusResponse
import tv.bayit.plus.core.model.TranscriptTimelineResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [CatchupRepository] backed by Retrofit.
 *
 * Provides access to live TV catch-up summaries, availability checks,
 * and transcript timeline data. Uses Beta 500 credits for AI summaries.
 */
@Singleton
class ApiCatchupRepository @Inject constructor(
    private val client: BayitApiClient,
) : CatchupRepository {

    private val service: CatchupService = client.createService()

    override suspend fun getSummary(
        channelId: String,
        windowMinutes: Int?,
        targetLanguage: String?,
    ): BayitResult<CatchUpSummaryResponse> = runCatchingResult {
        client.safeApiCall {
            service.getCatchupSummary(
                channelId = channelId,
                windowMinutes = windowMinutes,
                targetLanguage = targetLanguage,
            )
        }
    }

    override suspend fun checkAvailability(
        channelId: String,
    ): BayitResult<CatchUpAvailabilityResponse> = runCatchingResult {
        client.safeApiCall {
            service.getCatchupAvailability(channelId)
        }
    }

    override suspend fun getTranscriptTimeline(
        channelId: String,
        windowMinutes: Int?,
    ): BayitResult<TranscriptTimelineResponse> = runCatchingResult {
        client.safeApiCall {
            service.getTranscriptTimeline(
                channelId = channelId,
                windowMinutes = windowMinutes,
            )
        }
    }

    override suspend fun getTranscriptStatus(
        channelId: String,
    ): BayitResult<TranscriptStatusResponse> = runCatchingResult {
        client.safeApiCall {
            service.getTranscriptStatus(channelId)
        }
    }
}

private interface CatchupService {

    @GET("api/v1/live/{channelId}/catchup")
    suspend fun getCatchupSummary(
        @Path("channelId") channelId: String,
        @Query("window_minutes") windowMinutes: Int?,
        @Query("target_language") targetLanguage: String?,
    ): CatchUpSummaryResponse

    @GET("api/v1/live/{channelId}/catchup/available")
    suspend fun getCatchupAvailability(
        @Path("channelId") channelId: String,
    ): CatchUpAvailabilityResponse

    @GET("api/v1/live/{channelId}/transcripts")
    suspend fun getTranscriptTimeline(
        @Path("channelId") channelId: String,
        @Query("window_minutes") windowMinutes: Int?,
    ): TranscriptTimelineResponse

    @GET("api/v1/live/{channelId}/transcripts/status")
    suspend fun getTranscriptStatus(
        @Path("channelId") channelId: String,
    ): TranscriptStatusResponse
}
