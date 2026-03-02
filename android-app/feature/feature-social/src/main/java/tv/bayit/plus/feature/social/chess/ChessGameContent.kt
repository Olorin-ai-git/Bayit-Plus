package tv.bayit.plus.feature.social.chess

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private val terminalStatuses = setOf("checkmate", "stalemate", "draw", "resigned", "timeout")

@Composable
internal fun ChessGameContent(
    state: ChessUiState.GameActive,
    onTapSquare: (Int, Int) -> Unit,
    onResign: (String) -> Unit,
    onOfferDraw: (String) -> Unit,
    onRespondToDraw: (Boolean, String) -> Unit,
    onSendChat: (String) -> Unit,
    onToggleChat: () -> Unit,
    onNewGame: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val gameCode = state.game.gameCode
    val context = LocalContext.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        if (state.game.status == "waiting" && state.game.gameMode == "pvp") {
            GameCodeChip(gameCode, context)
        }

        StatusIndicator(state)

        ChessPlayerInfoView(
            player = state.game.blackPlayer,
            label = bayitString("chess.opponent"),
            isYou = false,
            timeRemainingMs = state.blackTimeRemainingMs,
            isCurrentTurn = state.currentTurn == "black",
        )

        ChessBoardComposable(
            board = state.board,
            selectedSquare = state.selectedSquare,
            lastMove = state.lastMove,
            currentTurn = state.currentTurn,
            onSquareTap = onTapSquare,
            modifier = Modifier.fillMaxWidth(),
        )

        ChessPlayerInfoView(
            player = state.game.whitePlayer,
            label = bayitString("chess.you"),
            isYou = true,
            timeRemainingMs = state.whiteTimeRemainingMs,
            isCurrentTurn = state.currentTurn == "white",
        )

        ChessControlsView(
            gameStatus = state.game.status,
            drawOffered = state.drawOffered,
            onResign = { onResign(gameCode) },
            onOfferDraw = { onOfferDraw(gameCode) },
            onAcceptDraw = { onRespondToDraw(true, gameCode) },
            onDeclineDraw = { onRespondToDraw(false, gameCode) },
            onNewGame = onNewGame,
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

        if (state.game.chatEnabled) {
            ChessChatPanel(
                messages = state.chatMessages,
                currentUserId = state.game.whitePlayer?.userId ?: "",
                isExpanded = state.isChatExpanded,
                onToggle = onToggleChat,
                onSend = onSendChat,
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

@Composable
private fun GameCodeChip(gameCode: String, context: Context) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "${bayitString("chess.gameCode")}: $gameCode",
            style = MaterialTheme.typography.titleSmall,
            color = DesignTokens.Colors.Text.primary,
            modifier = Modifier.weight(1f),
        )
        GlassButton(
            text = bayitString("chess.copyCode"),
            onClick = {
                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("Game Code", gameCode))
            },
        )
    }
}

@Composable
private fun StatusIndicator(state: ChessUiState.GameActive) {
    val statusText = when {
        state.game.status in terminalStatuses -> bayitString("chess.${state.game.status}")
        state.game.status == "waiting" -> bayitString("chess.waitingForOpponent")
        state.currentTurn == "white" -> bayitString("chess.whiteTurn")
        else -> bayitString("chess.blackTurn")
    }
    val color = if (state.game.status in terminalStatuses) {
        DesignTokens.Colors.Semantic.warning
    } else {
        DesignTokens.Colors.Text.secondary
    }
    Text(text = statusText, color = color, style = MaterialTheme.typography.bodyMedium)
}
