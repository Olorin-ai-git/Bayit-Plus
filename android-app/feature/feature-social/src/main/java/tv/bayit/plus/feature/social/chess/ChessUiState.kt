package tv.bayit.plus.feature.social.chess

import tv.bayit.plus.core.model.ChessGame
import tv.bayit.plus.core.model.ChessMoveEntry

sealed interface ChessUiState {
    data object Loading : ChessUiState
    data object Lobby : ChessUiState
    data class GameActive(
        val game: ChessGame,
        val board: List<List<Char?>>,
        val selectedSquare: Pair<Int, Int>? = null,
        val moveHistory: List<ChessMoveEntry> = emptyList(),
        val capturedByWhite: List<Char> = emptyList(),
        val capturedByBlack: List<Char> = emptyList(),
        val drawOffered: Boolean = false,
        val errorMessage: String? = null,
    ) : ChessUiState
    data class Error(val message: String) : ChessUiState
}
