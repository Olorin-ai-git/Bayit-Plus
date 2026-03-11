package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/live/{channelId}/catchup */
@Serializable
data class CatchUpSummaryResponse(
    val summary: String? = null,
    @SerialName("key_points") val keyPoints: List<String>? = null,
    @SerialName("program_info") val programInfo: CatchUpProgramInfo? = null,
    @SerialName("window_start") val windowStart: String? = null,
    @SerialName("window_end") val windowEnd: String? = null,
    @SerialName("window_minutes") val windowMinutes: Int? = null,
    val cached: Boolean? = null,
    @SerialName("credits_used") val creditsUsed: Int? = null,
    @SerialName("remaining_credits") val remainingCredits: Int? = null,
)

/** Program metadata within a catch-up summary. */
@Serializable
data class CatchUpProgramInfo(
    val title: String? = null,
    val description: String? = null,
    val host: String? = null,
)

/** Response from GET /api/v1/live/{channelId}/catchup/available */
@Serializable
data class CatchUpAvailabilityResponse(
    val available: Boolean = false,
    @SerialName("has_credits") val hasCredits: Boolean? = null,
    val balance: Int? = null,
)

/** Response from GET /api/v1/live/{channelId}/transcripts */
@Serializable
data class TranscriptTimelineResponse(
    val segments: List<TranscriptSegment> = emptyList(),
    @SerialName("channel_id") val channelId: String? = null,
    @SerialName("total_duration_ms") val totalDurationMs: Long? = null,
    val language: String? = null,
)

/** A single transcript segment for timeline navigation. */
@Serializable
data class TranscriptSegment(
    val id: String? = null,
    val text: String? = null,
    @SerialName("start_time_ms") val startTimeMs: Long? = null,
    @SerialName("end_time_ms") val endTimeMs: Long? = null,
    val speaker: String? = null,
    val confidence: Double? = null,
) {
    val stableId: String get() = id ?: "${startTimeMs ?: 0}-${endTimeMs ?: 0}"

    val durationMs: Long
        get() = (endTimeMs ?: 0L) - (startTimeMs ?: 0L)
}

/** Response from GET /api/v1/live/{channelId}/transcripts/status */
@Serializable
data class TranscriptStatusResponse(
    @SerialName("is_active") val isActive: Boolean = false,
    @SerialName("segments_count") val segmentsCount: Int? = null,
    @SerialName("last_segment_time") val lastSegmentTime: String? = null,
    val language: String? = null,
)
