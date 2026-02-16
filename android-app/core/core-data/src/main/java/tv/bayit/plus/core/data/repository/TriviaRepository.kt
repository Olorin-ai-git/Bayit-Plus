package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.QuizResponse
import tv.bayit.plus.core.model.QuizResult
import tv.bayit.plus.core.model.TriviaAnswerResult
import tv.bayit.plus.core.model.TriviaFactsResponse
import tv.bayit.plus.core.model.TriviaJoinResult
import tv.bayit.plus.core.model.TriviaLeaderboardEntry
import tv.bayit.plus.core.model.TriviaPreferences
import tv.bayit.plus.core.model.TriviaSession

interface TriviaRepository {

    suspend fun getActiveSessions(): BayitResult<List<TriviaSession>>

    suspend fun joinSession(sessionId: String): BayitResult<TriviaJoinResult>

    suspend fun submitAnswer(
        sessionId: String,
        questionId: String,
        answerId: String,
    ): BayitResult<TriviaAnswerResult>

    suspend fun getLeaderboard(sessionId: String): BayitResult<List<TriviaLeaderboardEntry>>

    suspend fun getHistory(): BayitResult<List<TriviaSession>>

    suspend fun fetchTrivia(
        contentId: String,
        language: String,
        multilingual: Boolean = true,
    ): BayitResult<TriviaFactsResponse>

    suspend fun fetchQuiz(
        contentId: String,
        profileId: String,
    ): BayitResult<QuizResponse>

    suspend fun submitQuiz(
        contentId: String,
        profileId: String,
        answers: Map<String, Int>,
    ): BayitResult<QuizResult>

    suspend fun fetchPreferences(): BayitResult<TriviaPreferences>

    suspend fun updatePreferences(preferences: TriviaPreferences): BayitResult<Unit>
}
