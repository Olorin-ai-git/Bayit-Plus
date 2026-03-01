package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ChessRepository
import tv.bayit.plus.core.model.ChessGame
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [ChessRepository] backed by Retrofit.
 *
 * All moves are sent via WebSocket (handled by [ChessWebSocketHandler]).
 * REST endpoints follow the backend API contract:
 *   POST /api/v1/chess/create
 *   POST /api/v1/chess/join
 *   GET  /api/v1/chess/{game_code}
 *   POST /api/v1/chess/{game_code}/resign
 *   POST /api/v1/chess/{game_code}/offer-draw
 */
@Singleton
class ApiChessRepository @Inject constructor(
    private val client: BayitApiClient,
) : ChessRepository {

    private val service: ChessService = client.createService()

    override suspend fun createGame(
        color: String,
        gameMode: String,
        botDifficulty: String?,
    ): BayitResult<ChessGame> = runCatchingResult {
        val body = CreateChessGameBody(
            color = color,
            gameMode = gameMode,
            botDifficulty = botDifficulty,
        )
        client.safeApiCall { service.createGame(body) }
    }

    override suspend fun joinGame(gameCode: String): BayitResult<ChessGame> = runCatchingResult {
        client.safeApiCall { service.joinGame(JoinChessGameBody(gameCode = gameCode)) }
    }

    override suspend fun getGame(gameCode: String): BayitResult<ChessGame> = runCatchingResult {
        client.safeApiCall { service.getGame(gameCode) }
    }

    override suspend fun resignGame(gameCode: String): BayitResult<ChessGame> = runCatchingResult {
        client.safeApiCall { service.resignGame(gameCode) }
    }

    override suspend fun offerDraw(gameCode: String): BayitResult<ChessGame> = runCatchingResult {
        client.safeApiCall { service.offerDraw(gameCode) }
    }
}

private interface ChessService {

    @POST("api/v1/chess/create")
    suspend fun createGame(@Body request: CreateChessGameBody): ChessGame

    @POST("api/v1/chess/join")
    suspend fun joinGame(@Body request: JoinChessGameBody): ChessGame

    @GET("api/v1/chess/{game_code}")
    suspend fun getGame(@Path("game_code") gameCode: String): ChessGame

    @POST("api/v1/chess/{game_code}/resign")
    suspend fun resignGame(@Path("game_code") gameCode: String): ChessGame

    @POST("api/v1/chess/{game_code}/offer-draw")
    suspend fun offerDraw(@Path("game_code") gameCode: String): ChessGame
}

@Serializable
private data class CreateChessGameBody(
    val color: String,
    @SerialName("game_mode") val gameMode: String,
    @SerialName("bot_difficulty") val botDifficulty: String? = null,
    @SerialName("time_control") val timeControl: String? = null,
)

@Serializable
private data class JoinChessGameBody(
    @SerialName("game_code") val gameCode: String,
)
