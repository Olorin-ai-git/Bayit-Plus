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
        onResign = viewModel::resign,
        onOfferDraw = viewModel::offerDraw,
        onRespondToDraw = viewModel::respondToDraw,
        onSendChat = { msg ->
            val state = uiState as? ChessUiState.GameActive ?: return@ChessScreen
            viewModel.sendChatMessage(state.game.gameCode, msg)
        },
        onToggleChat = viewModel::toggleChatExpanded,
        onNavigateToLobby = viewModel::navigateToLobby,
        modifier = modifier,
    )
}

@Composable
internal fun ChessScreen(
    uiState: ChessUiState,
    onCreateGame: (String, String, String?, Int?) -> Unit,
    onJoinGame: (String) -> Unit,
    onTapSquare: (Int, Int) -> Unit,
    onResign: (String) -> Unit,
    onOfferDraw: (String) -> Unit,
    onRespondToDraw: (Boolean, String) -> Unit,
    onSendChat: (String) -> Unit,
    onToggleChat: () -> Unit,
    onNavigateToLobby: () -> Unit,
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
                onSendChat = onSendChat,
                onToggleChat = onToggleChat,
                onNewGame = onNavigateToLobby,
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
