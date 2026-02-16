package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.TriviaRepository
import tv.bayit.plus.core.model.QuizResponse
import tv.bayit.plus.core.model.QuizResult
import tv.bayit.plus.core.model.TriviaFactsResponse
import tv.bayit.plus.core.model.TriviaPreferences
import tv.bayit.plus.core.model.TriviaSession
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [TriviaRepository] backed by Retrofit.
 *
 * Supports both session-based trivia (interactive quiz) and facts-based
 * trivia (player overlay facts with timed triggers).
 */
@Singleton
class ApiTriviaRepository @Inject constructor(
    private val client: BayitApiClient,
) : TriviaRepository {

    private val service: TriviaApiService = client.createService()

    override suspend fun getActiveSessions(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getActiveSessions() }
            response.sessions
        }

    override suspend fun joinSession(sessionId: String): BayitResult<Any> =
        runCatchingResult { client.safeApiCall { service.joinSession(sessionId) } }

    override suspend fun submitAnswer(
        sessionId: String,
        questionId: String,
        answerId: String,
    ): BayitResult<Any> = runCatchingResult {
        val body = TriviaAnswerBody(questionId = questionId, answerId = answerId)
        client.safeApiCall { service.submitAnswer(sessionId, body) }
    }

    override suspend fun getLeaderboard(sessionId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getLeaderboard(sessionId) }
            response.entries
        }

    override suspend fun getHistory(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getActiveSessions() }
        response.sessions
    }

    override suspend fun fetchTrivia(
        contentId: String,
        language: String,
        multilingual: Boolean,
    ): BayitResult<TriviaFactsResponse> = runCatchingResult {
        client.safeApiCall { service.getTrivia(contentId, language, multilingual) }
    }

    override suspend fun fetchQuiz(
        contentId: String,
        profileId: String,
    ): BayitResult<QuizResponse> = runCatchingResult {
        client.safeApiCall { service.getQuiz(contentId, profileId) }
    }

    override suspend fun submitQuiz(
        contentId: String,
        profileId: String,
        answers: Map<String, Int>,
    ): BayitResult<QuizResult> = runCatchingResult {
        val body = QuizSubmitBody(contentId = contentId, profileId = profileId, answers = answers)
        client.safeApiCall { service.submitQuiz(body) }
    }

    override suspend fun fetchPreferences(): BayitResult<TriviaPreferences> =
        runCatchingResult { client.safeApiCall { service.getPreferences() } }

    override suspend fun updatePreferences(
        preferences: TriviaPreferences,
    ): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall { service.updatePreferences(preferences) }
        Unit
    }
}

private interface TriviaApiService {
    @GET("api/v1/trivia/sessions/active")
    suspend fun getActiveSessions(): TriviaSessionsResponse

    @POST("api/v1/trivia/session/{id}/join")
    suspend fun joinSession(@Path("id") sessionId: String): TriviaJoinResponse

    @POST("api/v1/trivia/session/{id}/answer")
    suspend fun submitAnswer(@Path("id") sessionId: String, @Body body: TriviaAnswerBody): TriviaAnswerResponse

    @GET("api/v1/trivia/leaderboard")
    suspend fun getLeaderboard(@Query("session_id") sessionId: String): TriviaLeaderboardResponse

    @GET("api/v1/trivia/{contentId}")
    suspend fun getTrivia(
        @Path("contentId") contentId: String,
        @Query("language") language: String,
        @Query("multilingual") multilingual: Boolean,
    ): TriviaFactsResponse

    @GET("api/v1/trivia/{contentId}/quiz")
    suspend fun getQuiz(@Path("contentId") contentId: String, @Query("profile_id") profileId: String): QuizResponse

    @POST("api/v1/trivia/quiz/submit")
    suspend fun submitQuiz(@Body body: QuizSubmitBody): QuizResult

    @GET("api/v1/trivia/preferences/me")
    suspend fun getPreferences(): TriviaPreferences

    @PUT("api/v1/trivia/preferences/me")
    suspend fun updatePreferences(@Body body: TriviaPreferences): TriviaPreferences
}

@Serializable private data class TriviaSessionsResponse(val sessions: List<TriviaSession> = emptyList())
@Serializable private data class TriviaJoinResponse(@SerialName("session_id") val sessionId: String, val status: String? = null)
@Serializable private data class TriviaAnswerBody(@SerialName("question_id") val questionId: String, @SerialName("answer_id") val answerId: String)
@Serializable private data class TriviaAnswerResponse(@SerialName("is_correct") val isCorrect: Boolean, val score: Int? = null)
@Serializable private data class TriviaLeaderboardResponse(val entries: List<TriviaLeaderboardEntry> = emptyList())
@Serializable private data class TriviaLeaderboardEntry(@SerialName("user_id") val userId: String, val score: Int, val rank: Int)
@Serializable private data class QuizSubmitBody(
    @SerialName("content_id") val contentId: String,
    @SerialName("profile_id") val profileId: String,
    val answers: Map<String, Int>,
)
