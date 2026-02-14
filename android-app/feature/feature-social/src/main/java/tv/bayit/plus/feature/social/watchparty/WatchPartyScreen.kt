package tv.bayit.plus.feature.social.watchparty

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.WatchParty
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun WatchPartyRoute(
    onNavigateToActiveParty: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: WatchPartyViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val joinCode by viewModel.joinCode.collectAsStateWithLifecycle()
    val mediaId by viewModel.mediaId.collectAsStateWithLifecycle()

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is WatchPartyUiState.Created -> onNavigateToActiveParty(state.party.id)
            is WatchPartyUiState.Joined -> onNavigateToActiveParty(state.party.id)
            else -> Unit
        }
    }

    WatchPartyScreen(
        uiState = uiState,
        joinCode = joinCode,
        mediaId = mediaId,
        onJoinCodeChanged = viewModel::updateJoinCode,
        onMediaIdChanged = viewModel::updateMediaId,
        onCreateParty = viewModel::createParty,
        onJoinParty = viewModel::joinParty,
        modifier = modifier,
    )
}

@Composable
internal fun WatchPartyScreen(
    uiState: WatchPartyUiState,
    joinCode: String,
    mediaId: String,
    onJoinCodeChanged: (String) -> Unit,
    onMediaIdChanged: (String) -> Unit,
    onCreateParty: () -> Unit,
    onJoinParty: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Watch Party")

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
        ) {
            CreatePartySection(
                mediaId = mediaId,
                onMediaIdChanged = onMediaIdChanged,
                onCreate = onCreateParty,
                isCreating = uiState is WatchPartyUiState.Creating,
            )
            JoinPartySection(
                code = joinCode,
                onCodeChanged = onJoinCodeChanged,
                onJoin = onJoinParty,
                isJoining = uiState is WatchPartyUiState.Joining,
            )
            if (uiState is WatchPartyUiState.Error) {
                Text(
                    text = uiState.message,
                    color = DesignTokens.Colors.Semantic.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

@Composable
private fun CreatePartySection(
    mediaId: String,
    onMediaIdChanged: (String) -> Unit,
    onCreate: () -> Unit,
    isCreating: Boolean,
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(
                text = "Create a Watch Party",
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
                fontSize = DesignTokens.FontSize.lg,
            )
            GlassTextField(
                value = mediaId,
                onValueChange = onMediaIdChanged,
                label = "Content ID",
                placeholder = "Enter content to watch",
            )
            if (isCreating) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            } else {
                GlassButton(
                    text = "Create Party",
                    onClick = onCreate,
                    enabled = mediaId.isNotBlank(),
                )
            }
        }
    }
}

@Composable
private fun JoinPartySection(
    code: String,
    onCodeChanged: (String) -> Unit,
    onJoin: () -> Unit,
    isJoining: Boolean,
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(
                text = "Join a Watch Party",
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
                fontSize = DesignTokens.FontSize.lg,
            )
            GlassTextField(
                value = code,
                onValueChange = onCodeChanged,
                label = "Party Code",
                placeholder = "Enter party code",
            )
            if (isJoining) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            } else {
                GlassButton(
                    text = "Join Party",
                    onClick = onJoin,
                    enabled = code.isNotBlank(),
                    isPrimary = false,
                )
            }
        }
    }
}
