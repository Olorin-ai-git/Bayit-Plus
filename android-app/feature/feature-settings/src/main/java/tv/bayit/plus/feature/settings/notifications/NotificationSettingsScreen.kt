package tv.bayit.plus.feature.settings.notifications

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun NotificationSettingsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: NotificationSettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    NotificationSettingsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onToggleLiveAlerts = viewModel::toggleLiveAlerts,
        onToggleDownloadComplete = viewModel::toggleDownloadComplete,
        onToggleSocialUpdates = viewModel::toggleSocialUpdates,
        onToggleContentRecs = viewModel::toggleContentRecommendations,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun NotificationSettingsScreen(
    uiState: NotificationUiState,
    onNavigateBack: () -> Unit,
    onToggleLiveAlerts: (Boolean) -> Unit,
    onToggleDownloadComplete: (Boolean) -> Unit,
    onToggleSocialUpdates: (Boolean) -> Unit,
    onToggleContentRecs: (Boolean) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Notifications",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is NotificationUiState.Loading -> GlassLoadingIndicator()
            is NotificationUiState.Error -> NotificationErrorContent(message = uiState.message, onRetry = onRetry)
            is NotificationUiState.Success -> NotificationToggles(
                state = uiState,
                onToggleLiveAlerts = onToggleLiveAlerts,
                onToggleDownloadComplete = onToggleDownloadComplete,
                onToggleSocialUpdates = onToggleSocialUpdates,
                onToggleContentRecs = onToggleContentRecs,
            )
        }
    }
}

@Composable
private fun NotificationToggles(
    state: NotificationUiState.Success,
    onToggleLiveAlerts: (Boolean) -> Unit,
    onToggleDownloadComplete: (Boolean) -> Unit,
    onToggleSocialUpdates: (Boolean) -> Unit,
    onToggleContentRecs: (Boolean) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item { NotificationToggleRow(label = "Live TV Alerts", description = "Get notified when live channels go on air", checked = state.liveAlerts, enabled = !state.isSaving, onToggle = onToggleLiveAlerts) }
        item { NotificationToggleRow(label = "Download Complete", description = "Notify when downloads finish", checked = state.downloadComplete, enabled = !state.isSaving, onToggle = onToggleDownloadComplete) }
        item { NotificationToggleRow(label = "Social Updates", description = "Friend requests, watch party invites", checked = state.socialUpdates, enabled = !state.isSaving, onToggle = onToggleSocialUpdates) }
        item { NotificationToggleRow(label = "Content Recommendations", description = "Personalized content suggestions", checked = state.contentRecommendations, enabled = !state.isSaving, onToggle = onToggleContentRecs) }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun NotificationToggleRow(
    label: String,
    description: String,
    checked: Boolean,
    enabled: Boolean,
    onToggle: (Boolean) -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = label, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                Text(text = description, color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
            }
            Switch(
                checked = checked,
                onCheckedChange = onToggle,
                enabled = enabled,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = DesignTokens.Colors.Text.primary,
                    checkedTrackColor = DesignTokens.Colors.Primary.base,
                    uncheckedThumbColor = DesignTokens.Colors.Text.muted,
                    uncheckedTrackColor = DesignTokens.Colors.Glass.bgStrong,
                ),
            )
        }
    }
}

@Composable
private fun NotificationErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
