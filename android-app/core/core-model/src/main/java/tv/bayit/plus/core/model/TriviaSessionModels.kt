package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Result of joining a live trivia session. */
@Serializable
data class TriviaJoinResult(
    @SerialName("session_id") val sessionId: String,
    val status: String? = null,
)

/** Result of submitting a single trivia answer. */
@Serializable
data class TriviaAnswerResult(
    @SerialName("is_correct") val isCorrect: Boolean,
    val score: Int? = null,
)

/** A single entry on the trivia leaderboard. */
@Serializable
data class TriviaLeaderboardEntry(
    @SerialName("user_id") val userId: String,
    val score: Int,
    val rank: Int,
)
