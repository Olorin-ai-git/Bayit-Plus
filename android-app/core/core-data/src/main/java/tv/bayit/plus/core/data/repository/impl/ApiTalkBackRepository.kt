package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.TalkBackRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [TalkBackRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APITalkBackRepository and web api.js.
 */
class ApiTalkBackRepository(
    private val client: BayitApiClient,
) : TalkBackRepository {

    private val service: TalkBackService = client.createService()

    override suspend fun startSession(channelId: String): BayitResult<Any> =
        runCatchingResult {
            val request = TalkBackStartRequest(channelId = channelId)
            client.safeApiCall { service.startSession(request) }
        }

    override suspend fun endSession(sessionId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.endSession(sessionId) }
            Unit
        }

    override suspend fun sendAudioChunk(
        sessionId: String,
        audioData: ByteArray,
    ): BayitResult<Unit> = runCatchingResult {
        val body = audioData.toRequestBody(AUDIO_PCM_TYPE)
        client.safeApiCall { service.sendAudioChunk(sessionId, body) }
        Unit
    }

    override suspend fun getActiveSession(): BayitResult<Any?> =
        runCatchingResult {
            client.safeApiCall { service.getActiveSession() }
        }

    override suspend fun getSessionHistory(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getSessions() }
            response.items
        }

    override suspend fun updateSessionSettings(
        sessionId: String,
        settings: Map<String, Any>,
    ): BayitResult<Unit> = runCatchingResult {
        val request = TalkBackSettingsRequest(
            volume = (settings["volume"] as? Number)?.toDouble(),
            noiseReduction = settings["noise_reduction"] as? Boolean,
            language = settings["language"] as? String,
        )
        client.safeApiCall {
            service.updateSessionSettings(sessionId, request)
        }
        Unit
    }
}

private interface TalkBackService {

    @POST("api/v1/talkback/session")
    suspend fun startSession(
        @Body request: TalkBackStartRequest,
    ): TalkBackSessionResponse

    @DELETE("api/v1/talkback/session/{id}")
    suspend fun endSession(
        @Path("id") sessionId: String,
    ): MessageResponse

    @POST("api/v1/talkback/session/{id}/audio")
    suspend fun sendAudioChunk(
        @Path("id") sessionId: String,
        @Body audioData: okhttp3.RequestBody,
    ): MessageResponse

    @GET("api/v1/talkback/session/active")
    suspend fun getActiveSession(): TalkBackSessionResponse?

    @GET("api/v1/talkback/sessions")
    suspend fun getSessions(): TalkBackSessionListResponse

    @PUT("api/v1/talkback/session/{id}/settings")
    suspend fun updateSessionSettings(
        @Path("id") sessionId: String,
        @Body request: TalkBackSettingsRequest,
    ): MessageResponse
}

/** Request body for starting a TalkBack session. */
@Serializable
private data class TalkBackStartRequest(
    @SerialName("channel_id") val channelId: String,
)

/** Detail response for a single TalkBack session. */
@Serializable
private data class TalkBackSessionResponse(
    val id: String,
    @SerialName("channel_id") val channelId: String? = null,
    val status: String? = null,
    @SerialName("started_at") val startedAt: String? = null,
    @SerialName("ended_at") val endedAt: String? = null,
    @SerialName("duration_ms") val durationMs: Long? = null,
    val settings: TalkBackSessionSettings? = null,
)

/** Settings nested within a TalkBack session. */
@Serializable
private data class TalkBackSessionSettings(
    val volume: Double? = null,
    @SerialName("noise_reduction") val noiseReduction: Boolean = true,
    val language: String? = null,
)

/** List wrapper for session history. */
@Serializable
private data class TalkBackSessionListResponse(
    val items: List<TalkBackSessionResponse> = emptyList(),
)

/** Request body for updating session settings. */
@Serializable
private data class TalkBackSettingsRequest(
    val volume: Double? = null,
    @SerialName("noise_reduction") val noiseReduction: Boolean? = null,
    val language: String? = null,
)

private val AUDIO_PCM_TYPE = "audio/pcm".toMediaType()
