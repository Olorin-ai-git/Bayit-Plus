package tv.bayit.plus.feature.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun SettingsRoute(
    onNavigateBack: () -> Unit,
    onNavigateToMenuItem: (String) -> Unit,
    onLoggedOut: () -> Unit,
    onReplayTour: () -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val tipsEnabled by viewModel.tipsEnabled.collectAsStateWithLifecycle()
    SettingsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onMenuItemClick = { route ->
            if (route == "replay_tour") {
                viewModel.resetTourState()
                onReplayTour()
            } else {
                onNavigateToMenuItem(route)
            }
        },
        onLogout = {
            viewModel.logout()
            onLoggedOut()
        },
        onRetry = viewModel::retry,
        tipsEnabled = tipsEnabled,
        onTipsToggled = viewModel::setTipsEnabled,
        modifier = modifier,
    )
}

@Composable
internal fun SettingsScreen(
    uiState: SettingsUiState,
    onNavigateBack: () -> Unit,
    onMenuItemClick: (String) -> Unit,
    onLogout: () -> Unit,
    onRetry: () -> Unit,
    tipsEnabled: Boolean = true,
    onTipsToggled: (Boolean) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Settings",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is SettingsUiState.Loading -> GlassLoadingIndicator()
            is SettingsUiState.Error -> SettingsErrorContent(message = uiState.message, onRetry = onRetry)
            is SettingsUiState.Success -> SettingsContent(
                displayName = uiState.displayName,
                email = uiState.email,
                onMenuItemClick = onMenuItemClick,
                onLogout = onLogout,
                tipsEnabled = tipsEnabled,
                onTipsToggled = onTipsToggled,
            )
        }
    }
}

@Composable
private fun SettingsContent(
    displayName: String,
    email: String,
    onMenuItemClick: (String) -> Unit,
    onLogout: () -> Unit,
    tipsEnabled: Boolean,
    onTipsToggled: (Boolean) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item(key = "user_header") {
            Spacer(Modifier.height(DesignTokens.Spacing.base))
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(text = displayName, style = MaterialTheme.typography.titleMedium, color = DesignTokens.Colors.Text.primary)
                    Text(text = email, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.secondary)
                }
            }
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
        }
        items(items = settingsMenuItems(), key = { it.route }) { item ->
            SettingsMenuRow(item = item, onClick = { onMenuItemClick(item.route) })
        }
        item(key = "tips_toggle") {
            TipsToggleRow(tipsEnabled = tipsEnabled, onToggle = onTipsToggled)
        }
        item(key = "logout") {
            Spacer(Modifier.height(DesignTokens.Spacing.base))
            GlassButton(text = "Sign Out", onClick = onLogout, isPrimary = false, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(DesignTokens.Spacing.xxl))
        }
    }
}

@Composable
private fun TipsToggleRow(tipsEnabled: Boolean, onToggle: (Boolean) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Text(
                text = stringResource(tv.bayit.plus.feature.onboarding.R.string.settings_tips_label),
                color = DesignTokens.Colors.Text.primary,
                modifier = Modifier.weight(1f),
            )
            Switch(
                checked = tipsEnabled,
                onCheckedChange = onToggle,
                colors = SwitchDefaults.colors(checkedTrackColor = DesignTokens.Colors.Primary.base),
            )
        }
    }
}

@Composable
private fun SettingsMenuRow(item: SettingsMenuItem, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Icon(item.icon, contentDescription = null, tint = DesignTokens.Colors.Primary.light, modifier = Modifier.size(24.dp))
            Text(text = item.titleKey, color = DesignTokens.Colors.Text.primary, modifier = Modifier.weight(1f).padding(start = DesignTokens.Spacing.md))
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = DesignTokens.Colors.Text.muted)
        }
    }
}

@Composable
private fun SettingsErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
