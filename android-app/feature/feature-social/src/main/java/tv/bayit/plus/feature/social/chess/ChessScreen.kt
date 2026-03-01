package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar

@Composable
fun ChessRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ChessViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    ChessScreen(
        uiState = uiState,
        onCreateGame = viewModel::createGame,
        onJoinGame = viewModel::joinGame,
        onTapSquare = viewModel::tapSquare,
        onResign = { gameCode -> viewModel.resign(gameCode) },
        onOfferDraw = { gameCode -> viewModel.offerDraw(gameCode) },
        onRespondToDraw = { accept, gameCode -> viewModel.respondToDraw(accept, gameCode) },
        modifier = modifier,
    )
}

@Composable
internal fun ChessScreen(
    uiState: ChessUiState,
    onCreateGame: (String, String, String?) -> Unit,
    onJoinGame: (String) -> Unit,
    onTapSquare: (Int, Int) -> Unit,
    onResign: (String) -> Unit,
    onOfferDraw: (String) -> Unit,
    onRespondToDraw: (Boolean, String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Chess")
        when (uiState) {
            is ChessUiState.Loading -> GlassLoadingIndicator()
            is ChessUiState.Lobby -> ChessLobbyScreen(
                onCreateGame = onCreateGame,
                onJoinGame = onJoinGame,
            )
            is ChessUiState.GameActive -> ChessGameContent(
                state = uiState,
                onTapSquare = onTapSquare,
                onResign = onResign,
                onOfferDraw = onOfferDraw,
                onRespondToDraw = onRespondToDraw,
            )
            is ChessUiState.Error -> ErrorContent(uiState.message)
        }
    }
}

@Composable
private fun ErrorContent(message: String) {
    androidx.compose.foundation.layout.Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = androidx.compose.ui.Alignment.Center,
    ) {
        androidx.compose.material3.Text(
            text = message,
            color = tv.bayit.plus.designsystem.theme.DesignTokens.Colors.Semantic.error,
            style = androidx.compose.material3.MaterialTheme.typography.bodyLarge,
        )
    }
}
