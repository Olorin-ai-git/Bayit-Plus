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
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [ChessRepository] backed by Retrofit and WebSocket.
 *
 * Uses [BayitApiClient] for REST endpoints (game CRUD, history) and
 * [WebSocketManager] for real-time move streaming. Every public method wraps
 * the network call in [runCatchingResult] so callers receive a [BayitResult]
 * instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIChessRepository and web api.js.
 */
@Singleton
class ApiChessRepository @Inject constructor(
    private val client: BayitApiClient,
    private val webSocketManager: WebSocketManager,
) : ChessRepository {

    private val service: ChessService = client.createService()

    override suspend fun getGame(gameId: String): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getGame(gameId) }
    }

    override suspend fun makeMove(gameId: String, move: String): BayitResult<Any> =
        runCatchingResult {
            val body = ChessMoveBody(move = move)
            client.safeApiCall { service.makeMove(gameId, body) }
        }

    override suspend fun getActiveGames(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getActiveGames() }
        response.games
    }

    override suspend fun createGame(
        opponentId: String?,
        timeControl: String,
    ): BayitResult<Any> = runCatchingResult {
        val body = CreateChessGameBody(
            opponentId = opponentId,
            timeControl = timeControl,
        )
        client.safeApiCall { service.createGame(body) }
    }

    override suspend fun resignGame(gameId: String): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall { service.resignGame(gameId) }
        Unit
    }

    override suspend fun offerDraw(gameId: String): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall { service.offerDraw(gameId) }
        Unit
    }

    override suspend fun getGameHistory(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getGameHistory() }
        response.games
    }
}

private interface ChessService {

    @GET("api/v1/chess/game/{id}")
    suspend fun getGame(@Path("id") gameId: String): ChessGame

    @POST("api/v1/chess/game/{id}/move")
    suspend fun makeMove(
        @Path("id") gameId: String,
        @Body request: ChessMoveBody,
    ): ChessGame

    @GET("api/v1/chess/games/active")
    suspend fun getActiveGames(): ChessGamesResponse

    @POST("api/v1/chess/game")
    suspend fun createGame(@Body request: CreateChessGameBody): ChessGame

    @POST("api/v1/chess/game/{id}/resign")
    suspend fun resignGame(@Path("id") gameId: String): ChessActionResponse

    @POST("api/v1/chess/game/{id}/draw")
    suspend fun offerDraw(@Path("id") gameId: String): ChessActionResponse

    @GET("api/v1/chess/games/history")
    suspend fun getGameHistory(): ChessGamesResponse
}

/** Request body for submitting a chess move (e.g. "e2e4", "Nf3"). */
@Serializable
private data class ChessMoveBody(
    val move: String,
)

/** Request body for creating a new chess game. */
@Serializable
private data class CreateChessGameBody(
    @SerialName("opponent_id") val opponentId: String? = null,
    @SerialName("time_control") val timeControl: String,
)

/** Response wrapper for chess game list endpoints. */
@Serializable
private data class ChessGamesResponse(
    val games: List<ChessGame> = emptyList(),
)

/** Generic response for chess game actions (resign, draw offer). */
@Serializable
private data class ChessActionResponse(
    val success: Boolean = true,
    val message: String? = null,
)
