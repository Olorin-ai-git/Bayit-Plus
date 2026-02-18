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
import tv.bayit.plus.core.model.NotificationSettings
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
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
        onUpdate = viewModel::updateSettings,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun NotificationSettingsScreen(
    uiState: NotificationUiState,
    onNavigateBack: () -> Unit,
    onUpdate: (NotificationSettings) -> Unit,
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
            actions = {
                if (uiState is NotificationUiState.Success && uiState.isSaving) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            },
        )
        when (uiState) {
            is NotificationUiState.Loading -> GlassLoadingIndicator()
            is NotificationUiState.Error -> NotifErrorContent(message = uiState.message, onRetry = onRetry)
            is NotificationUiState.Success -> NotifContent(state = uiState, onUpdate = onUpdate)
        }
    }
}

@Composable
private fun NotifContent(state: NotificationUiState.Success, onUpdate: (NotificationSettings) -> Unit) {
    val s = state.settings
    val saving = state.isSaving
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item { NotifToggle("Live TV Alerts", "Get notified when live channels go on air", s.liveAlerts, saving) { onUpdate(s.copy(liveAlerts = it)) } }
        item { NotifToggle("Download Complete", "Notify when downloads finish", s.downloadComplete, saving) { onUpdate(s.copy(downloadComplete = it)) } }
        item { NotifToggle("Social Updates", "Friend requests, watch party invites", s.socialUpdates, saving) { onUpdate(s.copy(socialUpdates = it)) } }
        item { NotifToggle("Content Recommendations", "Personalized content suggestions", s.contentRecommendations, saving) { onUpdate(s.copy(contentRecommendations = it)) } }
        item { NotifToggle("Credits Alerts", "Notify when credits are low", s.creditsAlerts, saving) { onUpdate(s.copy(creditsAlerts = it)) } }
        item { NotifToggle("Email Digest", "Receive content updates via email", s.emailDigest, saving) { onUpdate(s.copy(emailDigest = it)) } }
        if (s.emailDigest) {
            item { FrequencySelect(s.emailDigestFrequency, saving) { onUpdate(s.copy(emailDigestFrequency = it)) } }
        }
        item { NotifToggle("Quiet Hours", "Mute notifications during set hours", s.quietHoursEnabled, saving) { onUpdate(s.copy(quietHoursEnabled = it)) } }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun NotifToggle(label: String, description: String, checked: Boolean, isSaving: Boolean, onToggle: (Boolean) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = label, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                Text(text = description, color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
            }
            Switch(
                checked = checked, onCheckedChange = onToggle, enabled = !isSaving,
                colors = SwitchDefaults.colors(checkedThumbColor = DesignTokens.Colors.Text.primary, checkedTrackColor = DesignTokens.Colors.Primary.base, uncheckedThumbColor = DesignTokens.Colors.Text.muted, uncheckedTrackColor = DesignTokens.Colors.Glass.bgStrong),
            )
        }
    }
}

@Composable
private fun FrequencySelect(selected: String, isSaving: Boolean, onSelect: (String) -> Unit) {
    val options = listOf("daily", "weekly", "monthly")
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text(text = "Digest Frequency", color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                options.forEach { option ->
                    GlassButton(text = option.replaceFirstChar { it.uppercase() }, onClick = { if (!isSaving) onSelect(option) }, isPrimary = option == selected)
                }
            }
        }
    }
}

@Composable
private fun NotifErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
