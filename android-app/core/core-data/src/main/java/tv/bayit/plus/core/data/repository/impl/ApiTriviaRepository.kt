package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.TriviaRepository
import tv.bayit.plus.core.model.TriviaSession
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [TriviaRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APITriviaRepository and web api.js.
 */
@Singleton
class ApiTriviaRepository @Inject constructor(
    private val client: BayitApiClient,
) : TriviaRepository {

    private val service: TriviaService = client.createService()

    override suspend fun getActiveSessions(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getActiveSessions() }
            response.sessions
        }

    override suspend fun joinSession(sessionId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.joinSession(sessionId) }
        }

    override suspend fun submitAnswer(
        sessionId: String,
        questionId: String,
        answerId: String,
    ): BayitResult<Any> = runCatchingResult {
        val body = TriviaAnswerBody(
            questionId = questionId,
            answerId = answerId,
        )
        client.safeApiCall { service.submitAnswer(sessionId, body) }
    }

    override suspend fun getLeaderboard(
        sessionId: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getLeaderboard(sessionId)
        }
        response.entries
    }

    override suspend fun getHistory(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getActiveSessions() }
        response.sessions
    }
}

private interface TriviaService {

    @GET("api/v1/trivia/sessions/active")
    suspend fun getActiveSessions(): TriviaSessionsResponse

    @POST("api/v1/trivia/session/{id}/join")
    suspend fun joinSession(
        @Path("id") sessionId: String,
    ): TriviaJoinResponse

    @POST("api/v1/trivia/session/{id}/answer")
    suspend fun submitAnswer(
        @Path("id") sessionId: String,
        @Body body: TriviaAnswerBody,
    ): TriviaAnswerResponse

    @GET("api/v1/trivia/leaderboard")
    suspend fun getLeaderboard(
        @Query("session_id") sessionId: String,
    ): TriviaLeaderboardResponse
}

/** Response wrapper for active trivia sessions. */
@Serializable
private data class TriviaSessionsResponse(
    val sessions: List<TriviaSession> = emptyList(),
)

/** Response from joining a trivia session. */
@Serializable
private data class TriviaJoinResponse(
    @SerialName("session_id") val sessionId: String,
    val status: String? = null,
    @SerialName("participant_count") val participantCount: Int? = null,
)

/** Request body for submitting a trivia answer. */
@Serializable
private data class TriviaAnswerBody(
    @SerialName("question_id") val questionId: String,
    @SerialName("answer_id") val answerId: String,
)

/** Response from submitting a trivia answer. */
@Serializable
private data class TriviaAnswerResponse(
    @SerialName("is_correct") val isCorrect: Boolean,
    @SerialName("correct_answer") val correctAnswer: String? = null,
    val score: Int? = null,
    @SerialName("time_bonus") val timeBonus: Int? = null,
)

/** Response wrapper for the trivia leaderboard. */
@Serializable
private data class TriviaLeaderboardResponse(
    val entries: List<TriviaLeaderboardEntry> = emptyList(),
)

/** A single entry on the trivia leaderboard. */
@Serializable
private data class TriviaLeaderboardEntry(
    @SerialName("user_id") val userId: String,
    @SerialName("display_name") val displayName: String? = null,
    val score: Int,
    val rank: Int,
    @SerialName("correct_answers") val correctAnswers: Int? = null,
)
