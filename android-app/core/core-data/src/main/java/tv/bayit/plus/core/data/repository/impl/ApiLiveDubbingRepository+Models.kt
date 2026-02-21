package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import tv.bayit.plus.core.model.DubbingVoice

internal interface LiveDubbingService {

    @GET("api/v1/live/{channelId}/dubbing/availability")
    suspend fun getDubbingAvailability(
        @Path("channelId") channelId: String,
    ): DubbingAvailabilityResponse

    @GET("api/v1/live/dubbing/voices")
    suspend fun getVoices(): VoicesListResponse

    @POST("api/v1/live-dubbing/start")
    suspend fun startDubbing(
        @Body body: StartDubbingBody,
    ): DubbingSessionResponse

    @POST("api/v1/live-dubbing/stop")
    suspend fun stopDubbing(
        @Body body: StopDubbingBody,
    ): DubbingStopResponse

    @PUT("api/v1/live-dubbing/volume")
    suspend fun updateVolumeMix(
        @Body body: VolumeMixBody,
    ): DubbingVolumeResponse
}

@Serializable
internal data class VoicesListResponse(
    val voices: List<DubbingVoice> = emptyList(),
)

@Serializable
internal data class DubbingAvailabilityResponse(
    val available: Boolean,
    @SerialName("source_language") val sourceLanguage: String? = null,
    @SerialName("supported_target_languages")
    val supportedTargetLanguages: List<String> = emptyList(),
    @SerialName("default_voice_id") val defaultVoiceId: String? = null,
    @SerialName("default_sync_delay_ms") val defaultSyncDelayMs: Int? = null,
    val error: String? = null,
)

@Serializable
internal data class DubbingLanguageItem(
    val code: String,
    val available: Boolean,
)

@Serializable
internal data class StartDubbingBody(
    @SerialName("channel_id") val channelId: String,
    @SerialName("target_language") val targetLanguage: String,
)

@Serializable
internal data class DubbingSessionResponse(
    @SerialName("session_id") val sessionId: String,
    val status: String? = null,
    @SerialName("stream_url") val streamUrl: String? = null,
)

@Serializable
internal data class StopDubbingBody(
    @SerialName("session_id") val sessionId: String,
)

@Serializable
internal data class DubbingStopResponse(
    val success: Boolean = true,
    val message: String? = null,
)

@Serializable
internal data class VolumeMixBody(
    @SerialName("session_id") val sessionId: String,
    @SerialName("original_volume") val originalVolume: Float,
    @SerialName("dubbing_volume") val dubbingVolume: Float,
)

@Serializable
internal data class DubbingVolumeResponse(
    val success: Boolean = true,
)
