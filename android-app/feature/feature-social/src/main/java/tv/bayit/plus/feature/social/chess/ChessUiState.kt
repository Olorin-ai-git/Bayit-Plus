package tv.bayit.plus.feature.social.chess

import tv.bayit.plus.core.model.ChessChatMessage
import tv.bayit.plus.core.model.ChessGame
import tv.bayit.plus.core.model.ChessMoveEntry

sealed interface ChessUiState {
    data object Loading : ChessUiState
    data class Lobby(val isWhatsAppSharing: Boolean = false) : ChessUiState
    data class GameActive(
        val game: ChessGame,
        val board: List<List<Char?>>,
        val localUserId: String? = null,
        val selectedSquare: Pair<Int, Int>? = null,
        val lastMove: Pair<String, String>? = null,
        val currentTurn: String = "white",
        val whiteTimeRemainingMs: Long? = null,
        val blackTimeRemainingMs: Long? = null,
        val moveHistory: List<ChessMoveEntry> = emptyList(),
        val capturedByWhite: List<Char> = emptyList(),
        val capturedByBlack: List<Char> = emptyList(),
        val drawOffered: Boolean = false,
        val chatMessages: List<ChessChatMessage> = emptyList(),
        val isChatExpanded: Boolean = false,
        val errorMessage: String? = null,
    ) : ChessUiState
    data class Error(val message: String) : ChessUiState
}
