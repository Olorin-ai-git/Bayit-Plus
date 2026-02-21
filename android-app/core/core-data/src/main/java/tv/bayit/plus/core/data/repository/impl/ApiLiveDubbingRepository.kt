package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.LiveDubbingRepository
import tv.bayit.plus.core.model.DubbingAvailability
import tv.bayit.plus.core.model.DubbingVoice
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [LiveDubbingRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APILiveDubbingRepository and web api.js.
 */
@Singleton
class ApiLiveDubbingRepository @Inject constructor(
    private val client: BayitApiClient,
) : LiveDubbingRepository {

    private val service: LiveDubbingService = client.createService()

    override suspend fun getAvailableLanguages(
        channelId: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getDubbingAvailability(channelId)
        }
        response.supportedTargetLanguages.map { lang ->
            DubbingLanguageItem(
                code = lang,
                available = response.available,
            )
        }
    }

    override suspend fun getAvailability(
        channelId: String,
    ): BayitResult<DubbingAvailability> = runCatchingResult {
        val response = client.safeApiCall {
            service.getDubbingAvailability(channelId)
        }
        DubbingAvailability(
            channelId = channelId,
            supportedLanguages = response.supportedTargetLanguages,
            isAvailable = response.available,
            defaultVoiceId = response.defaultVoiceId,
            defaultSyncDelayMs = response.defaultSyncDelayMs,
        )
    }

    override suspend fun getVoices(): BayitResult<List<DubbingVoice>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getVoices() }
            response.voices
        }

    override suspend fun startDubbing(
        channelId: String,
        languageCode: String,
    ): BayitResult<Any> = runCatchingResult {
        val body = StartDubbingBody(
            channelId = channelId,
            targetLanguage = languageCode,
        )
        client.safeApiCall { service.startDubbing(body) }
    }

    override suspend fun stopDubbing(sessionId: String): BayitResult<Unit> =
        runCatchingResult {
            val body = StopDubbingBody(sessionId = sessionId)
            client.safeApiCall { service.stopDubbing(body) }
            Unit
        }

    override suspend fun getDubbingStatus(
        sessionId: String,
    ): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.startDubbing(StartDubbingBody(channelId = sessionId, targetLanguage = "")) }
    }

    override suspend fun setVolumeMix(
        sessionId: String,
        originalVolume: Float,
        dubbingVolume: Float,
    ): BayitResult<Unit> = runCatchingResult {
        val body = VolumeMixBody(
            sessionId = sessionId,
            originalVolume = originalVolume,
            dubbingVolume = dubbingVolume,
        )
        client.safeApiCall { service.updateVolumeMix(body) }
        Unit
    }
}

// Service interface and models are in ApiLiveDubbingRepository+Models.kt
