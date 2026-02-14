package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface ChessRepository {
    suspend fun getGame(gameId: String): BayitResult<Any>
    suspend fun makeMove(gameId: String, move: String): BayitResult<Any>
    suspend fun getActiveGames(): BayitResult<List<Any>>
    suspend fun createGame(opponentId: String?, timeControl: String): BayitResult<Any>
    suspend fun resignGame(gameId: String): BayitResult<Unit>
    suspend fun offerDraw(gameId: String): BayitResult<Unit>
    suspend fun getGameHistory(): BayitResult<List<Any>>
}
