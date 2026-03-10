package tv.bayit.plus.feature.social.chess

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ChessRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ChessViewModel = hiltViewModel(),
    inviteViewModel: ChessInviteViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val friends by viewModel.friends.collectAsStateWithLifecycle()
    val isFriendsLoading by viewModel.isFriendsLoading.collectAsStateWithLifecycle()
    val inviteState by inviteViewModel.inviteState.collectAsStateWithLifecycle()
    val pendingWhatsApp by viewModel.pendingWhatsAppMessage.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        inviteViewModel.acceptedGame.collect { game ->
            viewModel.transitionToGame(game)
        }
    }

    LaunchedEffect(pendingWhatsApp) {
        val message = pendingWhatsApp ?: return@LaunchedEffect
        val encoded = Uri.encode(message)
        val waUri = Uri.parse("https://wa.me/?text=$encoded")
        val intent = Intent(Intent.ACTION_VIEW, waUri).apply {
            setPackage("com.whatsapp")
        }
        if (intent.resolveActivity(context.packageManager) != null) {
            context.startActivity(intent)
        } else {
            context.startActivity(Intent(Intent.ACTION_VIEW, waUri))
        }
        viewModel.clearPendingWhatsAppMessage()
    }

    Box(modifier = modifier.fillMaxSize()) {
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
            friends = friends,
            isFriendsLoading = isFriendsLoading,
            onInviteFriend = { friendId, color, timeControl ->
                val lobbyState = uiState as? ChessUiState.Lobby
                if (lobbyState != null) {
                    viewModel.inviteFriend(friendId, color, timeControl)
                }
            },
            onChallengeViaWhatsApp = viewModel::createGameForWhatsApp,
        )
        ChessInviteBanner(
            state = inviteState,
            onAccept = inviteViewModel::acceptInvite,
            onDecline = inviteViewModel::declineInvite,
            modifier = Modifier.align(Alignment.TopCenter).fillMaxWidth(),
        )
    }
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
    friends: List<Friend> = emptyList(),
    isFriendsLoading: Boolean = false,
    onInviteFriend: (String, String, Int?) -> Unit = { _, _, _ -> },
    onChallengeViaWhatsApp: (String, Int?) -> Unit = { _, _ -> },
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("social.chess.title"))
        when (uiState) {
            is ChessUiState.Loading -> GlassLoadingIndicator()
            is ChessUiState.Lobby -> ChessLobbyScreen(
                onCreateGame = onCreateGame,
                onJoinGame = onJoinGame,
                friends = friends,
                isFriendsLoading = isFriendsLoading,
                onInviteFriend = onInviteFriend,
                onChallengeViaWhatsApp = onChallengeViaWhatsApp,
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
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = message,
            color = DesignTokens.Colors.Semantic.error,
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}
