package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.PhoneticMirrorRepository
import tv.bayit.plus.core.data.repository.PracticePhrase
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [PhoneticMirrorRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIPhoneticMirrorRepository and web api.js.
 */
class ApiPhoneticMirrorRepository(
    private val client: BayitApiClient,
) : PhoneticMirrorRepository {

    private val service: PhoneticMirrorService = client.createService()

    override suspend fun getPhoneticGuide(
        text: String,
        languageCode: String,
    ): BayitResult<Any> = runCatchingResult {
        val request = PhoneticGuideRequest(
            text = text,
            language = languageCode,
        )
        client.safeApiCall { service.getPhoneticGuide(request) }
    }

    override suspend fun getPronunciationAudio(
        text: String,
        languageCode: String,
    ): BayitResult<String> = runCatchingResult {
        val response = client.safeApiCall {
            service.getPronunciationAudio(text, languageCode)
        }
        response.audioUrl
            ?: throw IllegalStateException("No audio URL returned for text pronunciation")
    }

    override suspend fun submitPronunciationAttempt(
        text: String,
        audioData: ByteArray,
    ): BayitResult<Any> = runCatchingResult {
        val body = audioData.toRequestBody(AUDIO_WAV_TYPE)
        client.safeApiCall { service.submitAttempt(text, body) }
    }

    override suspend fun getProgress(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getProgress() }
        }

    override suspend fun getLessonPlan(languageCode: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getLessons(languageCode)
            }
            response.lessons
        }

    override suspend fun fetchPhrases(
        profileId: String,
        difficulty: String,
        count: Int,
    ): BayitResult<List<PracticePhrase>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getPhrases(profileId, difficulty, count)
        }
        response.phrases.map { p ->
            PracticePhrase(
                phraseHe = p.phraseHe,
                transliteration = p.transliteration,
                translation = p.translation,
            )
        }
    }
}

// Service interface and models are in ApiPhoneticMirrorRepository+Models.kt
