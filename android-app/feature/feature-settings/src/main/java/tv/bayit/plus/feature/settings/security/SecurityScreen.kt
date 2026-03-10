package tv.bayit.plus.feature.settings.security

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
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun SecurityRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SecurityViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    SecurityScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onRevokeSession = viewModel::revokeSession,
        onToggle2FA = viewModel::toggleTwoFactor,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun SecurityScreen(
    uiState: SecurityUiState,
    onNavigateBack: () -> Unit,
    onRevokeSession: (String) -> Unit,
    onToggle2FA: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("settings.security.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is SecurityUiState.Loading -> GlassLoadingIndicator()
            is SecurityUiState.Error -> SecurityErrorContent(message = uiState.message, onRetry = onRetry)
            is SecurityUiState.Success -> SecurityContent(state = uiState, onRevokeSession = onRevokeSession, onToggle2FA = onToggle2FA)
        }
    }
}

@Composable
private fun SecurityContent(
    state: SecurityUiState.Success,
    onRevokeSession: (String) -> Unit,
    onToggle2FA: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = bayitString("settings.security.twoFactor"), color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                        Text(text = bayitString("settings.security.twoFactorDescription"), color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    }
                    Switch(
                        checked = state.twoFactorEnabled,
                        onCheckedChange = { onToggle2FA() },
                        enabled = !state.isProcessing,
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
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = bayitString("settings.security.activeSessions"), color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.titleMedium)
                GlassBadge(count = state.activeSessions.size, modifier = Modifier.padding(start = DesignTokens.Spacing.sm))
            }
        }
        items(items = state.activeSessions, key = { it.hashCode() }) { session ->
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Text(text = session.toString(), color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    GlassButton(text = bayitString("settings.security.revoke"), onClick = { onRevokeSession(session.hashCode().toString()) }, isPrimary = false)
                }
            }
        }
        item {
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            Text(text = bayitString("settings.security.loginHistory"), color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.titleMedium)
        }
        items(items = state.loginHistory, key = { it.hashCode() }) { entry ->
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Text(text = entry.toString(), color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
            }
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun SecurityErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
