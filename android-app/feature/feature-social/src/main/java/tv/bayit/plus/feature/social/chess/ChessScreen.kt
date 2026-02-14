package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.ChessGame
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val BOARD_SIZE = 8

@Composable
fun ChessRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ChessViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val moveInput by viewModel.moveInput.collectAsStateWithLifecycle()
    ChessScreen(uiState, moveInput, viewModel::updateMoveInput, viewModel::submitMove, viewModel::createGame, viewModel::resign, modifier)
}

@Composable
internal fun ChessScreen(
    uiState: ChessUiState, moveInput: String, onMoveInputChanged: (String) -> Unit,
    onSubmitMove: () -> Unit, onCreateGame: (String) -> Unit, onResign: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Chess")
        when (uiState) {
            is ChessUiState.Loading -> GlassLoadingIndicator()
            is ChessUiState.GameList -> GameListContent(uiState.games, onCreateGame)
            is ChessUiState.GameActive -> GameContent(uiState, moveInput, onMoveInputChanged, onSubmitMove, onResign)
            is ChessUiState.Error -> ErrorContent(uiState.message)
        }
    }
}

@Composable
private fun GameListContent(games: List<ChessGame>, onCreateGame: (String) -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        GlassButton(text = "New Game", onClick = { onCreateGame("standard") })
        LazyColumn(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            items(games, key = { it.id }) { game ->
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(text = "Game ${game.id.take(8)}", color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
                            Text(text = game.status, color = DesignTokens.Colors.Text.muted, fontSize = DesignTokens.FontSize.sm)
                        }
                        Text(text = "${game.moves.size} moves", color = DesignTokens.Colors.Text.secondary, fontSize = DesignTokens.FontSize.sm)
                    }
                }
            }
        }
    }
}

@Composable
private fun GameContent(
    state: ChessUiState.GameActive, moveInput: String, onMoveInputChanged: (String) -> Unit,
    onSubmitMove: () -> Unit, onResign: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = state.game.status, color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold, fontSize = DesignTokens.FontSize.md,
                textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth(),
            )
        }
        ChessBoardView(fen = state.game.fen)
        if (state.game.moves.isNotEmpty()) {
            Text(text = "Moves: ${state.game.moves.joinToString(", ")}", color = DesignTokens.Colors.Text.secondary, fontSize = DesignTokens.FontSize.sm, maxLines = 2)
        }
        if (state.errorMessage != null) {
            Text(text = state.errorMessage, color = DesignTokens.Colors.Semantic.error, fontSize = DesignTokens.FontSize.sm)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm), verticalAlignment = Alignment.CenterVertically) {
            GlassTextField(value = moveInput, onValueChange = onMoveInputChanged, placeholder = "e.g. e2e4", modifier = Modifier.weight(1f))
            GlassButton(text = "Move", onClick = onSubmitMove, enabled = moveInput.isNotBlank())
        }
        GlassButton(text = "Resign", onClick = onResign, isPrimary = false)
    }
}

@Composable
private fun ChessBoardView(fen: String) {
    val ranks = fen.split(" ").firstOrNull()?.split("/").orEmpty()
    LazyVerticalGrid(
        columns = GridCells.Fixed(BOARD_SIZE),
        modifier = Modifier.fillMaxWidth().aspectRatio(1f),
        userScrollEnabled = false,
    ) {
        items(BOARD_SIZE * BOARD_SIZE) { index ->
            val row = index / BOARD_SIZE
            val col = index % BOARD_SIZE
            val isLight = (row + col) % 2 == 0
            val piece = getPieceAt(ranks, row, col)
            Box(
                modifier = Modifier.aspectRatio(1f).background(
                    if (isLight) DesignTokens.Colors.Primary.p200 else DesignTokens.Colors.Primary.p800,
                ),
                contentAlignment = Alignment.Center,
            ) {
                if (piece != null) {
                    Text(text = piece, fontSize = DesignTokens.FontSize.lg, color = DesignTokens.Colors.Text.primary)
                }
            }
        }
    }
}

@Composable
private fun ErrorContent(message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text = message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodyLarge)
    }
}
