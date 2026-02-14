package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface TriviaRepository {
    suspend fun getActiveSessions(): BayitResult<List<Any>>
    suspend fun joinSession(sessionId: String): BayitResult<Any>
    suspend fun submitAnswer(sessionId: String, questionId: String, answerId: String): BayitResult<Any>
    suspend fun getLeaderboard(sessionId: String): BayitResult<List<Any>>
    suspend fun getHistory(): BayitResult<List<Any>>
}
