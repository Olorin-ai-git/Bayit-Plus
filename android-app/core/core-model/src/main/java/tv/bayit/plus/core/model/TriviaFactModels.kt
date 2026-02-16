package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * A single trivia fact displayed as an overlay during playback.
 * Supports multilingual text with Hebrew, English, and Spanish fields.
 */
@Serializable
data class TriviaFact(
    val id: String,
    @SerialName("text_he") val textHe: String? = null,
    @SerialName("text_en") val textEn: String? = null,
    @SerialName("text_es") val textEs: String? = null,
    val translations: Map<String, String> = emptyMap(),
    val category: String? = null,
    @SerialName("trigger_time") val triggerTime: Double? = null,
    @SerialName("trigger_type") val triggerType: String? = null,
    @SerialName("display_duration") val displayDuration: Int? = null,
    val priority: Int? = null,
    @SerialName("related_person") val relatedPerson: String? = null,
    @SerialName("chain_id") val chainId: String? = null,
    @SerialName("chain_order") val chainOrder: Int? = null,
    @SerialName("has_follow_up") val hasFollowUp: Boolean? = null,
    @SerialName("detected_topic") val detectedTopic: String? = null,
) {
    /** Returns text for the given language code, falling back through the priority chain. */
    fun textForLanguage(code: String): String? = when (code) {
        "he" -> textHe ?: translations[code]
        "en" -> textEn ?: translations[code]
        "es" -> textEs ?: translations[code]
        else -> translations[code] ?: textEn
    }
}

/** Response from GET /api/v1/trivia/{contentId} */
@Serializable
data class TriviaFactsResponse(
    val facts: List<TriviaFact> = emptyList(),
    @SerialName("content_id") val contentId: String? = null,
    val language: String? = null,
)

/** User trivia preferences. */
@Serializable
data class TriviaPreferences(
    @SerialName("auto_show") val autoShow: Boolean = true,
    @SerialName("display_duration") val displayDuration: Int? = null,
    @SerialName("preferred_language") val preferredLanguage: String? = null,
    @SerialName("show_follow_ups") val showFollowUps: Boolean = true,
)

/** A quiz question tied to trivia content. */
@Serializable
data class QuizQuestion(
    val id: String,
    val question: String,
    val options: List<String>,
    @SerialName("correct_index") val correctIndex: Int,
    @SerialName("time_limit") val timeLimit: Int? = null,
    @SerialName("fact_id") val factId: String? = null,
)

/** Response from quiz generation endpoint. */
@Serializable
data class QuizResponse(
    val questions: List<QuizQuestion> = emptyList(),
    @SerialName("content_id") val contentId: String? = null,
)

/** Result from quiz submission. */
@Serializable
data class QuizResult(
    val score: Int,
    @SerialName("total_questions") val totalQuestions: Int,
    @SerialName("correct_answers") val correctAnswers: Int,
    @SerialName("time_taken") val timeTaken: Long? = null,
)
