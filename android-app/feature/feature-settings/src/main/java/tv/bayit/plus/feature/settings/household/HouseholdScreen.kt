package tv.bayit.plus.feature.settings.household

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassBadge
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun HouseholdRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HouseholdViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    HouseholdScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onInviteEmailChange = viewModel::updateInviteEmail,
        onInvite = viewModel::inviteMember,
        onRemoveMember = viewModel::removeMember,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun HouseholdScreen(
    uiState: HouseholdUiState,
    onNavigateBack: () -> Unit,
    onInviteEmailChange: (String) -> Unit,
    onInvite: () -> Unit,
    onRemoveMember: (String) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Household",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is HouseholdUiState.Loading -> GlassLoadingIndicator()
            is HouseholdUiState.Error -> HouseholdErrorContent(message = uiState.message, onRetry = onRetry)
            is HouseholdUiState.Success -> HouseholdContent(
                state = uiState,
                onInviteEmailChange = onInviteEmailChange,
                onInvite = onInvite,
                onRemoveMember = onRemoveMember,
            )
        }
    }
}

@Composable
private fun HouseholdContent(
    state: HouseholdUiState.Success,
    onInviteEmailChange: (String) -> Unit,
    onInvite: () -> Unit,
    onRemoveMember: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(text = "Invite Member", color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    GlassTextField(
                        value = state.inviteEmail,
                        onValueChange = onInviteEmailChange,
                        label = "Email Address",
                        enabled = !state.isProcessing,
                    )
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    GlassButton(
                        text = "Send Invite",
                        onClick = onInvite,
                        enabled = state.inviteEmail.isNotBlank() && !state.isProcessing,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "Members", color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.titleMedium)
                GlassBadge(count = state.members.size, modifier = Modifier.padding(start = DesignTokens.Spacing.sm))
            }
        }
        if (state.members.isEmpty()) {
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "No household members yet. Invite family members to share your Bayit+ subscription.",
                        color = DesignTokens.Colors.Text.secondary,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        } else {
            items(items = state.members, key = { it.hashCode() }) { member ->
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Text(text = member.toString(), color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                        GlassButton(text = "Remove", onClick = { onRemoveMember(member.hashCode().toString()) }, isPrimary = false, enabled = !state.isProcessing)
                    }
                }
            }
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun HouseholdErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
