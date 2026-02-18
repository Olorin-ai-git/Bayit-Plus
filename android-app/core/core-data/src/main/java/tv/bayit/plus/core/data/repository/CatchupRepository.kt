package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.CatchUpAvailabilityResponse
import tv.bayit.plus.core.model.CatchUpSummaryResponse
import tv.bayit.plus.core.model.TranscriptStatusResponse
import tv.bayit.plus.core.model.TranscriptTimelineResponse

interface CatchupRepository {

    suspend fun getSummary(
        channelId: String,
        windowMinutes: Int? = null,
        targetLanguage: String? = null,
    ): BayitResult<CatchUpSummaryResponse>

    suspend fun checkAvailability(
        channelId: String,
    ): BayitResult<CatchUpAvailabilityResponse>

    suspend fun getTranscriptTimeline(
        channelId: String,
        windowMinutes: Int? = null,
    ): BayitResult<TranscriptTimelineResponse>

    suspend fun getTranscriptStatus(
        channelId: String,
    ): BayitResult<TranscriptStatusResponse>
}
