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

private interface PhoneticMirrorService {

    @POST("api/v1/phonetic/guide")
    suspend fun getPhoneticGuide(
        @Body request: PhoneticGuideRequest,
    ): PhoneticGuideResponse

    @GET("api/v1/phonetic/audio")
    suspend fun getPronunciationAudio(
        @Query("text") text: String,
        @Query("language") language: String,
    ): PhoneticAudioResponse

    @POST("api/v1/phonetic/attempt")
    suspend fun submitAttempt(
        @Query("text") text: String,
        @Body audioData: okhttp3.RequestBody,
    ): PhoneticAttemptResponse

    @GET("api/v1/phonetic/progress")
    suspend fun getProgress(): PhoneticProgressResponse

    @GET("api/v1/phonetic/lessons/{language}")
    suspend fun getLessons(
        @Path("language") language: String,
    ): PhoneticLessonsResponse

    @GET("api/v1/phonetic/phrases")
    suspend fun getPhrases(
        @Query("profile_id") profileId: String,
        @Query("difficulty") difficulty: String,
        @Query("count") count: Int,
    ): PhoneticPhrasesResponse
}

/** Request body for generating a phonetic guide. */
@Serializable
private data class PhoneticGuideRequest(
    val text: String,
    val language: String,
)

/** Response containing phonetic breakdown of the requested text. */
@Serializable
private data class PhoneticGuideResponse(
    val text: String? = null,
    val language: String? = null,
    val phonetic: String? = null,
    val syllables: List<PhoneticSyllable> = emptyList(),
    @SerialName("audio_url") val audioUrl: String? = null,
)

/** A single syllable within a phonetic breakdown. */
@Serializable
private data class PhoneticSyllable(
    val text: String,
    val ipa: String? = null,
    @SerialName("stress_level") val stressLevel: Int = 0,
)

/** Response containing a URL to pronunciation audio. */
@Serializable
private data class PhoneticAudioResponse(
    @SerialName("audio_url") val audioUrl: String? = null,
    @SerialName("duration_ms") val durationMs: Long? = null,
)

/** Response from submitting a pronunciation attempt for scoring. */
@Serializable
private data class PhoneticAttemptResponse(
    val score: Double? = null,
    val feedback: String? = null,
    @SerialName("problem_areas") val problemAreas: List<String> = emptyList(),
    @SerialName("is_passing") val isPassing: Boolean = false,
)

/** User progress in phonetic training. */
@Serializable
private data class PhoneticProgressResponse(
    @SerialName("total_attempts") val totalAttempts: Int = 0,
    @SerialName("average_score") val averageScore: Double = 0.0,
    @SerialName("lessons_completed") val lessonsCompleted: Int = 0,
    @SerialName("current_streak") val currentStreak: Int = 0,
    val level: Int = 1,
)

/** List wrapper for lesson plan endpoints. */
@Serializable
private data class PhoneticLessonsResponse(
    val lessons: List<PhoneticLesson> = emptyList(),
)

/** A single phonetic lesson. */
@Serializable
private data class PhoneticLesson(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val difficulty: String? = null,
    @SerialName("word_count") val wordCount: Int = 0,
    @SerialName("is_completed") val isCompleted: Boolean = false,
)

/** List wrapper for practice phrases response. */
@Serializable
private data class PhoneticPhrasesResponse(
    val phrases: List<PhoneticPhraseItem> = emptyList(),
)

/** A single Hebrew practice phrase with transliteration and English translation. */
@Serializable
private data class PhoneticPhraseItem(
    @SerialName("phrase_he") val phraseHe: String,
    val transliteration: String,
    val translation: String,
)

private val AUDIO_WAV_TYPE = "audio/wav".toMediaType()
