package tv.bayit.plus.feature.social.watchparty.active

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ActivePartyRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ActivePartyViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(uiState) {
        if (uiState is ActivePartyUiState.Left) {
            onNavigateBack()
        }
    }

    ActivePartyScreen(
        uiState = uiState,
        onSyncPlayback = viewModel::syncPlayback,
        onLeaveParty = viewModel::leaveParty,
        modifier = modifier,
    )
}

@Composable
internal fun ActivePartyScreen(
    uiState: ActivePartyUiState,
    onSyncPlayback: (Long, Boolean) -> Unit,
    onLeaveParty: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("social.watchParty.title"))

        when (uiState) {
            is ActivePartyUiState.Loading -> GlassLoadingIndicator()
            is ActivePartyUiState.Active -> ActiveContent(
                playbackUrl = uiState.playbackUrl,
                participants = uiState.participants,
                contentId = uiState.party.contentId,
                onLeaveParty = onLeaveParty,
            )
            is ActivePartyUiState.Error -> ErrorContent(uiState.message)
            is ActivePartyUiState.Left -> Unit
        }
    }
}

@Composable
private fun ActiveContent(
    playbackUrl: String,
    participants: List<Friend>,
    contentId: String,
    onLeaveParty: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item(key = "player") {
            PlayerPlaceholder(playbackUrl = playbackUrl)
        }
        item(key = "participants_header") {
            Text(
                text = bayitString("social.watchParty.participants"),
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
                fontSize = DesignTokens.FontSize.lg,
                modifier = Modifier.padding(top = DesignTokens.Spacing.sm),
            )
        }
        item(key = "participants") {
            ParticipantRow(participants = participants)
        }
        item(key = "controls") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                GlassButton(
                    text = bayitString("social.watchParty.leaveParty"),
                    onClick = onLeaveParty,
                    isPrimary = false,
                )
            }
        }
    }
}

@Composable
private fun PlayerPlaceholder(playbackUrl: String) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(16f / 9f),
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = bayitString("social.watchParty.synchronizedPlayer"),
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.md,
            )
        }
    }
}

@Composable
private fun ParticipantRow(participants: List<Friend>) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
        items(participants, key = { it.id }) { participant ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(modifier = Modifier.size(48.dp)) {
                    CachedAsyncImage(
                        url = participant.avatarUrl,
                        contentDescription = participant.displayName,
                        modifier = Modifier.size(48.dp).clip(CircleShape),
                    )
                    if (participant.isOnline) {
                        Box(
                            modifier = Modifier.size(10.dp).align(Alignment.BottomEnd)
                                .clip(CircleShape)
                                .background(DesignTokens.Colors.Semantic.success),
                        )
                    }
                }
                Text(
                    text = participant.displayName,
                    color = DesignTokens.Colors.Text.secondary,
                    fontSize = DesignTokens.FontSize.xs,
                )
            }
        }
    }
}

@Composable
private fun ErrorContent(message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            text = message,
            color = DesignTokens.Colors.Semantic.error,
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}
