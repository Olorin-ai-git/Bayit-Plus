package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/recordings */
@Serializable
data class RecordingsResponse(
    val items: List<RecordingItem> = emptyList(),
    val total: Int? = null,
)

/** A DVR recording item. */
@Serializable
data class RecordingItem(
    val id: String,
    @SerialName("channel_id") val channelId: String? = null,
    @SerialName("channel_name") val channelName: String? = null,
    @SerialName("program_title") val programTitle: String? = null,
    val thumbnail: String? = null,
    @SerialName("start_time") val startTime: String? = null,
    @SerialName("end_time") val endTime: String? = null,
    val duration: String? = null,
    val status: String? = null,
    @SerialName("file_size") val fileSize: Int? = null,
    @SerialName("recorded_at") val recordedAt: String? = null,
)

/** Request body for POST /api/v1/recordings/start */
@Serializable
data class RecordingStartRequest(
    @SerialName("channel_id") val channelId: String,
    @SerialName("program_id") val programId: String? = null,
    val duration: Int? = null,
)

/** Response from POST /api/v1/recordings/start */
@Serializable
data class RecordingStartResponse(
    @SerialName("recording_id") val recordingId: String? = null,
    val message: String? = null,
)
