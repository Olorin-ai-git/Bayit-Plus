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
import tv.bayit.plus.core.model.ChessChatMessage
import tv.bayit.plus.core.model.ChessGame
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApiChessRepository @Inject constructor(
    private val client: BayitApiClient,
) : ChessRepository {

    private val service: ChessService = client.createService()

    override suspend fun createGame(
        color: String,
        gameMode: String,
        botDifficulty: String?,
        timeControl: Int?,
    ): BayitResult<ChessGame> = runCatchingResult {
        val body = CreateChessGameBody(
            color = color,
            gameMode = gameMode,
            botDifficulty = botDifficulty,
            timeControl = timeControl,
        )
        client.safeApiCall { service.createGame(body) }.game
    }

    override suspend fun joinGame(gameCode: String): BayitResult<ChessGame> = runCatchingResult {
        client.safeApiCall { service.joinGame(JoinChessGameBody(gameCode = gameCode)) }.game
    }

    override suspend fun getGame(gameCode: String): BayitResult<ChessGame> = runCatchingResult {
        client.safeApiCall { service.getGame(gameCode) }
    }

    override suspend fun makeMove(
        gameCode: String,
        from: String,
        to: String,
    ): BayitResult<ChessGame> = runCatchingResult {
        val body = MoveBody(fromSquare = from, toSquare = to)
        client.safeApiCall { service.makeMove(gameCode, body) }.game
    }

    override suspend fun resignGame(gameCode: String): BayitResult<ChessGame> = runCatchingResult {
        client.safeApiCall { service.resignGame(gameCode) }.game
    }

    override suspend fun offerDraw(gameCode: String): BayitResult<ChessGame> = runCatchingResult {
        client.safeApiCall { service.offerDraw(gameCode) }.game
    }

    override suspend fun loadChatHistory(
        gameCode: String,
    ): BayitResult<List<ChessChatMessage>> = runCatchingResult {
        client.safeApiCall { service.getChatHistory(gameCode) }.messages
    }

    override suspend fun sendChatMessage(
        gameCode: String,
        message: String,
    ): BayitResult<ChessChatMessage> = runCatchingResult {
        client.safeApiCall { service.sendChatMessage(gameCode, SendChatBody(message = message)) }
    }

    override suspend fun invitePlayer(
        friendUserId: String,
        color: String,
        timeControl: Int?,
    ): BayitResult<ChessGame> = runCatchingResult {
        val body = InviteBody(friendUserId = friendUserId, color = color, timeControl = timeControl)
        client.safeApiCall { service.invitePlayer(body) }.game
    }

    override suspend fun getPendingInvites(): BayitResult<List<ChessGame>> = runCatchingResult {
        client.safeApiCall { service.getPendingInvites() }.invites
    }

    override suspend fun declineInvite(gameCode: String): BayitResult<Unit> = runCatchingResult {
        client.safeApiCall { service.declineInvite(gameCode) }
        Unit
    }
}

private interface ChessService {
    @POST("api/v1/chess/create")
    suspend fun createGame(@Body request: CreateChessGameBody): GameEnvelope

    @POST("api/v1/chess/join")
    suspend fun joinGame(@Body request: JoinChessGameBody): GameEnvelope

    @GET("api/v1/chess/{game_code}")
    suspend fun getGame(@Path("game_code") gameCode: String): ChessGame

    @POST("api/v1/chess/{game_code}/move")
    suspend fun makeMove(@Path("game_code") gameCode: String, @Body request: MoveBody): GameEnvelope

    @POST("api/v1/chess/{game_code}/resign")
    suspend fun resignGame(@Path("game_code") gameCode: String): GameEnvelope

    @POST("api/v1/chess/{game_code}/offer-draw")
    suspend fun offerDraw(@Path("game_code") gameCode: String): GameEnvelope

    @GET("api/v1/chess/{game_code}/chat")
    suspend fun getChatHistory(@Path("game_code") gameCode: String): ChatHistoryEnvelope

    @POST("api/v1/chess/{game_code}/chat")
    suspend fun sendChatMessage(
        @Path("game_code") gameCode: String,
        @Body request: SendChatBody,
    ): ChessChatMessage

    @POST("api/v1/chess/invite")
    suspend fun invitePlayer(@Body request: InviteBody): GameEnvelope

    @GET("api/v1/chess/invites/pending")
    suspend fun getPendingInvites(): PendingInvitesEnvelope

    @POST("api/v1/chess/{game_code}/decline-invite")
    suspend fun declineInvite(@Path("game_code") gameCode: String): DeclineResponse
}

@Serializable
private data class GameEnvelope(val game: ChessGame)

@Serializable
private data class ChatHistoryEnvelope(val messages: List<ChessChatMessage>)

@Serializable
private data class CreateChessGameBody(
    val color: String,
    @SerialName("game_mode") val gameMode: String,
    @SerialName("bot_difficulty") val botDifficulty: String? = null,
    @SerialName("time_control") val timeControl: Int? = null,
)

@Serializable
private data class JoinChessGameBody(@SerialName("game_code") val gameCode: String)

@Serializable
private data class MoveBody(
    @SerialName("from_square") val fromSquare: String,
    @SerialName("to_square") val toSquare: String,
)

@Serializable
private data class SendChatBody(val message: String)

@Serializable
private data class InviteBody(
    @SerialName("friend_user_id") val friendUserId: String,
    val color: String,
    @SerialName("time_control") val timeControl: Int? = null,
)

@Serializable
private data class PendingInvitesEnvelope(val invites: List<ChessGame>)

@Serializable
private data class DeclineResponse(val status: String)
