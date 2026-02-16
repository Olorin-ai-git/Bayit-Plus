package tv.bayit.plus.core.data.repository.impl

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
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
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.VoiceRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [VoiceRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIVoiceRepository and web api.js.
 */
@Singleton
class ApiVoiceRepository @Inject constructor(
    private val client: BayitApiClient,
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) : VoiceRepository {

    private val service: VoiceService = client.createService()

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    override suspend fun getAvailableVoices(
        languageCode: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getAvailableVoices(languageCode)
        }
        response.voices
    }

    override suspend fun getSelectedVoice(): BayitResult<Any> = runCatchingResult {
        val settings = client.safeApiCall { service.getVoiceSettings() }
        settings.selectedVoice ?: settings
    }

    override suspend fun setVoice(voiceId: String): BayitResult<Unit> =
        runCatchingResult {
            val body = VoiceSelectionBody(voiceId = voiceId)
            client.safeApiCall { service.updateVoiceSettings(body) }
            Unit
        }

    override suspend fun previewVoice(voiceId: String): BayitResult<String> =
        runCatchingResult {
            val body = VoicePreviewBody(voiceId = voiceId)
            val response = client.safeApiCall { service.previewVoice(body) }
            response.previewUrl
        }

    override suspend fun getVoiceSettings(): BayitResult<Any> = runCatchingResult {
        try {
            val response = client.safeApiCall { service.getVoiceSettings() }
            mapOf(
                "voice_id" to response.voiceId,
                "speed" to response.speed,
                "pitch" to response.pitch,
                "language" to response.language,
                "ai_onboarding_complete" to (response.aiOnboardingComplete ?: getLocalOnboardingStatus()),
                "voice_setup_complete" to (response.voiceSetupComplete ?: getLocalVoiceSetupStatus()),
            )
        } catch (e: Exception) {
            logger.warning("API unavailable, using local settings", mapOf("error" to e.message.orEmpty()))
            mapOf(
                "ai_onboarding_complete" to getLocalOnboardingStatus(),
                "voice_setup_complete" to getLocalVoiceSetupStatus(),
            )
        }
    }

    override suspend fun updateVoiceSettings(
        settings: Map<String, Any>,
    ): BayitResult<Unit> = runCatchingResult {
        val body = VoiceSettingsUpdateBody(
            voiceId = settings["voice_id"] as? String,
            speed = (settings["speed"] as? Number)?.toFloat(),
            pitch = (settings["pitch"] as? Number)?.toFloat(),
            language = settings["language"] as? String,
        )
        client.safeApiCall { service.updateVoiceSettings(body) }
        Unit
    }

    override suspend fun completeAIOnboarding(): BayitResult<Unit> =
        runCatchingResult {
            try {
                client.safeApiCall { service.completeAIOnboarding() }
                setLocalOnboardingStatus(true)
                logger.info("AI onboarding completed via API and persisted locally")
            } catch (e: Exception) {
                logger.warning("API unavailable, saving onboarding status locally", mapOf("error" to e.message.orEmpty()))
                setLocalOnboardingStatus(true)
            }
            Unit
        }

    override suspend fun completeVoiceSetup(): BayitResult<Unit> =
        runCatchingResult {
            try {
                client.safeApiCall { service.completeVoiceSetup() }
                setLocalVoiceSetupStatus(true)
                logger.info("Voice setup completed via API and persisted locally")
            } catch (e: Exception) {
                logger.warning("API unavailable, saving voice setup status locally", mapOf("error" to e.message.orEmpty()))
                setLocalVoiceSetupStatus(true)
            }
            Unit
        }

    private fun getLocalOnboardingStatus(): Boolean =
        prefs.getBoolean(KEY_AI_ONBOARDING_COMPLETE, false)

    private fun setLocalOnboardingStatus(complete: Boolean) {
        prefs.edit().putBoolean(KEY_AI_ONBOARDING_COMPLETE, complete).apply()
    }

    private fun getLocalVoiceSetupStatus(): Boolean =
        prefs.getBoolean(KEY_VOICE_SETUP_COMPLETE, false)

    private fun setLocalVoiceSetupStatus(complete: Boolean) {
        prefs.edit().putBoolean(KEY_VOICE_SETUP_COMPLETE, complete).apply()
    }

    companion object {
        private const val PREFS_NAME = "voice_repository_cache"
        private const val KEY_AI_ONBOARDING_COMPLETE = "ai_onboarding_complete"
        private const val KEY_VOICE_SETUP_COMPLETE = "voice_setup_complete"
    }

    override suspend fun trainVoiceModel(audioData: ByteArray): BayitResult<Unit> =
        runCatchingResult {
            val body = audioData.toRequestBody("audio/wav".toMediaType())
            client.safeApiCall { service.trainVoiceModel(body) }
            Unit
        }
}

private interface VoiceService {

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

/** Response from the available voices endpoint. */
@Serializable
private data class VoiceListResponse(
    val voices: List<VoiceItem> = emptyList(),
)

/** A single voice option. */
@Serializable
private data class VoiceItem(
    val id: String,
    val name: String,
    val language: String? = null,
    val description: String? = null,
    @SerialName("preview_url") val previewUrl: String? = null,
)

/** Response from the voice settings endpoint. */
@Serializable
private data class VoiceSettingsResponse(
    @SerialName("voice_id") val voiceId: String? = null,
    @SerialName("selected_voice") val selectedVoice: VoiceItem? = null,
    val speed: Float? = null,
    val pitch: Float? = null,
    val language: String? = null,
    @SerialName("ai_onboarding_complete") val aiOnboardingComplete: Boolean? = null,
    @SerialName("voice_setup_complete") val voiceSetupComplete: Boolean? = null,
)

/** Request body for selecting a voice. */
@Serializable
private data class VoiceSelectionBody(
    @SerialName("voice_id") val voiceId: String,
)

/** Request body for previewing a voice. */
@Serializable
private data class VoicePreviewBody(
    @SerialName("voice_id") val voiceId: String,
)

/** Response from the voice preview endpoint. */
@Serializable
private data class VoicePreviewResponse(
    @SerialName("preview_url") val previewUrl: String,
)

/** Request body for updating voice settings. */
@Serializable
private data class VoiceSettingsUpdateBody(
    @SerialName("voice_id") val voiceId: String? = null,
    val speed: Float? = null,
    val pitch: Float? = null,
    val language: String? = null,
)
