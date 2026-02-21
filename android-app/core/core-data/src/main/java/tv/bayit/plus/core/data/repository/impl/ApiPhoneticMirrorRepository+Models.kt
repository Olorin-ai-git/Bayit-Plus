package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

internal interface PhoneticMirrorService {

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

@Serializable
internal data class PhoneticGuideRequest(
    val text: String,
    val language: String,
)

@Serializable
internal data class PhoneticGuideResponse(
    val text: String? = null,
    val language: String? = null,
    val phonetic: String? = null,
    val syllables: List<PhoneticSyllable> = emptyList(),
    @SerialName("audio_url") val audioUrl: String? = null,
)

@Serializable
internal data class PhoneticSyllable(
    val text: String,
    val ipa: String? = null,
    @SerialName("stress_level") val stressLevel: Int = 0,
)

@Serializable
internal data class PhoneticAudioResponse(
    @SerialName("audio_url") val audioUrl: String? = null,
    @SerialName("duration_ms") val durationMs: Long? = null,
)

@Serializable
internal data class PhoneticAttemptResponse(
    val score: Double? = null,
    val feedback: String? = null,
    @SerialName("problem_areas") val problemAreas: List<String> = emptyList(),
    @SerialName("is_passing") val isPassing: Boolean = false,
)

@Serializable
internal data class PhoneticProgressResponse(
    @SerialName("total_attempts") val totalAttempts: Int = 0,
    @SerialName("average_score") val averageScore: Double = 0.0,
    @SerialName("lessons_completed") val lessonsCompleted: Int = 0,
    @SerialName("current_streak") val currentStreak: Int = 0,
    val level: Int = 1,
)

@Serializable
internal data class PhoneticLessonsResponse(
    val lessons: List<PhoneticLesson> = emptyList(),
)

@Serializable
internal data class PhoneticLesson(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val difficulty: String? = null,
    @SerialName("word_count") val wordCount: Int = 0,
    @SerialName("is_completed") val isCompleted: Boolean = false,
)

@Serializable
internal data class PhoneticPhrasesResponse(
    val phrases: List<PhoneticPhraseItem> = emptyList(),
)

@Serializable
internal data class PhoneticPhraseItem(
    @SerialName("phrase_he") val phraseHe: String,
    val transliteration: String,
    val translation: String,
)

internal val AUDIO_WAV_TYPE = "audio/wav".toMediaType()
