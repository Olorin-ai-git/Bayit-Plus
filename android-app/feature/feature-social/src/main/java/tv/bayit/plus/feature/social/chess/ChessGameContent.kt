package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun ChessGameContent(
    state: ChessUiState.GameActive,
    onTapSquare: (Int, Int) -> Unit,
    onResign: (String) -> Unit,
    onOfferDraw: (String) -> Unit,
    onRespondToDraw: (Boolean, String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val gameCode = state.game.gameCode

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        ChessPlayerInfoView(
            player = state.game.blackPlayer,
            label = bayitString("chess.opponent"),
            isYou = false,
        )

        ChessBoardComposable(
            board = state.board,
            selectedSquare = state.selectedSquare,
            currentTurn = state.game.currentTurn,
            onSquareTap = onTapSquare,
            modifier = Modifier.fillMaxWidth(),
        )

        ChessPlayerInfoView(
            player = state.game.whitePlayer,
            label = bayitString("chess.you"),
            isYou = true,
        )

        ChessControlsView(
            gameStatus = state.game.status,
            drawOffered = state.drawOffered,
            onResign = { onResign(gameCode) },
            onOfferDraw = { onOfferDraw(gameCode) },
            onAcceptDraw = { onRespondToDraw(true, gameCode) },
            onDeclineDraw = { onRespondToDraw(false, gameCode) },
        )

        if (state.moveHistory.isNotEmpty()) {
            ChessMoveHistoryView(moves = state.moveHistory)
        }

        if (state.capturedByWhite.isNotEmpty() || state.capturedByBlack.isNotEmpty()) {
            ChessCapturedPiecesView(
                capturedByWhite = state.capturedByWhite,
                capturedByBlack = state.capturedByBlack,
            )
        }

        if (state.errorMessage != null) {
            Text(
                text = state.errorMessage,
                color = DesignTokens.Colors.Semantic.error,
                fontSize = DesignTokens.FontSize.sm,
            )
        }
    }
}
