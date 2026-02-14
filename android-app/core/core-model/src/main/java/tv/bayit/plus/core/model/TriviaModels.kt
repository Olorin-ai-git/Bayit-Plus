package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

@Serializable
data class TriviaSession(
    val id: String,
    val contentId: String,
    val questions: List<TriviaQuestion> = emptyList(),
    val score: Int = 0,
    val totalQuestions: Int = 0,
)

@Serializable
data class TriviaQuestion(
    val id: String,
    val question: String,
    val options: List<String>,
    val correctIndex: Int,
    val timeLimit: Int? = null,
)

@Serializable
data class TriviaAnswer(
    val questionId: String,
    val selectedIndex: Int,
    val isCorrect: Boolean,
    val timeTaken: Long? = null,
)
