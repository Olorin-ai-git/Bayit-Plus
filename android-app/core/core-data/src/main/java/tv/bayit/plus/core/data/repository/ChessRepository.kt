package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ChessGame

interface ChessRepository {
    suspend fun createGame(
        color: String,
        gameMode: String,
        botDifficulty: String?,
    ): BayitResult<ChessGame>

    suspend fun joinGame(gameCode: String): BayitResult<ChessGame>

    suspend fun getGame(gameCode: String): BayitResult<ChessGame>

    suspend fun resignGame(gameCode: String): BayitResult<ChessGame>

    suspend fun offerDraw(gameCode: String): BayitResult<ChessGame>
}
