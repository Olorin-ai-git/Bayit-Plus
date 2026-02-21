package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.model.MessageResponse

internal suspend fun ApiVoiceRepository.trainVoiceModelImpl(audioData: ByteArray): BayitResult<Unit> =
    runCatchingResult {
        val body = audioData.toRequestBody("audio/wav".toMediaType())
        client.safeApiCall { service.trainVoiceModel(body) }
        Unit
    }

internal fun ApiVoiceRepository.getLocalOnboardingStatus(): Boolean =
    prefs.getBoolean(KEY_AI_ONBOARDING_COMPLETE, false)

internal fun ApiVoiceRepository.setLocalOnboardingStatus(complete: Boolean) {
    prefs.edit().putBoolean(KEY_AI_ONBOARDING_COMPLETE, complete).apply()
}

internal fun ApiVoiceRepository.getLocalVoiceSetupStatus(): Boolean =
    prefs.getBoolean(KEY_VOICE_SETUP_COMPLETE, false)

internal fun ApiVoiceRepository.setLocalVoiceSetupStatus(complete: Boolean) {
    prefs.edit().putBoolean(KEY_VOICE_SETUP_COMPLETE, complete).apply()
}

internal const val KEY_AI_ONBOARDING_COMPLETE = "ai_onboarding_complete"
internal const val KEY_VOICE_SETUP_COMPLETE = "voice_setup_complete"

internal interface VoiceService {

    @GET("api/v1/voice/available")
    suspend fun getAvailableVoices(
        @Query("language") language: String,
    ): VoiceListResponse

    @GET("api/v1/voice/settings")
    suspend fun getVoiceSettings(): VoiceSettingsResponse

    @PUT("api/v1/voice/settings")
    suspend fun updateVoiceSettings(
        @Body request: VoiceSelectionBody,
    ): VoiceSettingsResponse

    @PUT("api/v1/voice/settings")
    suspend fun updateVoiceSettings(
        @Body request: VoiceSettingsUpdateBody,
    ): VoiceSettingsResponse

    @POST("api/v1/voice/preview")
    suspend fun previewVoice(
        @Body request: VoicePreviewBody,
    ): VoicePreviewResponse

    @POST("api/v1/voice/onboarding/ai/complete")
    suspend fun completeAIOnboarding(): MessageResponse

    @POST("api/v1/voice/onboarding/voice/complete")
    suspend fun completeVoiceSetup(): MessageResponse

    @POST("api/v1/voice/train")
    suspend fun trainVoiceModel(
        @Body audioData: okhttp3.RequestBody,
    ): MessageResponse
}

@Serializable
internal data class VoiceListResponse(
    val voices: List<VoiceItem> = emptyList(),
)

@Serializable
internal data class VoiceItem(
    val id: String,
    val name: String,
    val language: String? = null,
    val description: String? = null,
    @SerialName("preview_url") val previewUrl: String? = null,
)

@Serializable
internal data class VoiceSettingsResponse(
    @SerialName("voice_id") val voiceId: String? = null,
    @SerialName("selected_voice") val selectedVoice: VoiceItem? = null,
    val speed: Float? = null,
    val pitch: Float? = null,
    val language: String? = null,
    @SerialName("ai_onboarding_complete") val aiOnboardingComplete: Boolean? = null,
    @SerialName("voice_setup_complete") val voiceSetupComplete: Boolean? = null,
)

@Serializable
internal data class VoiceSelectionBody(
    @SerialName("voice_id") val voiceId: String,
)

@Serializable
internal data class VoicePreviewBody(
    @SerialName("voice_id") val voiceId: String,
)

@Serializable
internal data class VoicePreviewResponse(
    @SerialName("preview_url") val previewUrl: String,
)

@Serializable
internal data class VoiceSettingsUpdateBody(
    @SerialName("voice_id") val voiceId: String? = null,
    val speed: Float? = null,
    val pitch: Float? = null,
    val language: String? = null,
)
