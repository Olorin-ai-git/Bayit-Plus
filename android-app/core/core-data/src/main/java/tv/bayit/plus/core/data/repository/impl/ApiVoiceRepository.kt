package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.VoiceRepository
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
) : VoiceRepository {

    private val service: VoiceService = client.createService()

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
        client.safeApiCall { service.getVoiceSettings() }
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
