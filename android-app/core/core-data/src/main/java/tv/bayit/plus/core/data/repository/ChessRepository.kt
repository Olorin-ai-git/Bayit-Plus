package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ChessChatMessage
import tv.bayit.plus.core.model.ChessGame

interface ChessRepository {
    suspend fun createGame(
        color: String,
        gameMode: String,
        botDifficulty: String?,
        timeControl: Int?,
    ): BayitResult<ChessGame>

    suspend fun joinGame(gameCode: String): BayitResult<ChessGame>

    suspend fun getGame(gameCode: String): BayitResult<ChessGame>

    suspend fun makeMove(gameCode: String, from: String, to: String): BayitResult<ChessGame>

    suspend fun resignGame(gameCode: String): BayitResult<ChessGame>

    suspend fun offerDraw(gameCode: String): BayitResult<ChessGame>

    suspend fun loadChatHistory(gameCode: String): BayitResult<List<ChessChatMessage>>

    suspend fun sendChatMessage(gameCode: String, message: String): BayitResult<ChessChatMessage>
}
