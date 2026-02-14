package tv.bayit.plus.feature.settings.accounts

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
fun ConnectedAccountsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ConnectedAccountsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    ConnectedAccountsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onLinkGoogle = viewModel::linkGoogle,
        onLinkApple = viewModel::linkApple,
        onLinkFacebook = viewModel::linkFacebook,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun ConnectedAccountsScreen(
    uiState: ConnectedAccountsUiState,
    onNavigateBack: () -> Unit,
    onLinkGoogle: () -> Unit,
    onLinkApple: () -> Unit,
    onLinkFacebook: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Connected Accounts",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is ConnectedAccountsUiState.Loading -> GlassLoadingIndicator()
            is ConnectedAccountsUiState.Error -> AccountsErrorContent(message = uiState.message, onRetry = onRetry)
            is ConnectedAccountsUiState.Success -> AccountsContent(
                state = uiState,
                onLinkGoogle = onLinkGoogle,
                onLinkApple = onLinkApple,
                onLinkFacebook = onLinkFacebook,
            )
        }
    }
}

@Composable
private fun AccountsContent(
    state: ConnectedAccountsUiState.Success,
    onLinkGoogle: () -> Unit,
    onLinkApple: () -> Unit,
    onLinkFacebook: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        item {
            AccountRow(
                provider = "Google",
                isConnected = state.googleConnected,
                isProcessing = state.isProcessing,
                onLink = onLinkGoogle,
            )
        }
        item {
            AccountRow(
                provider = "Apple",
                isConnected = state.appleConnected,
                isProcessing = state.isProcessing,
                onLink = onLinkApple,
            )
        }
        item {
            AccountRow(
                provider = "Facebook",
                isConnected = state.facebookConnected,
                isProcessing = state.isProcessing,
                onLink = onLinkFacebook,
            )
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "Email Verified", color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                    }
                    Text(
                        text = if (state.emailVerified) "Verified" else "Not Verified",
                        color = if (state.emailVerified) DesignTokens.Colors.Semantic.success else DesignTokens.Colors.Semantic.warning,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun AccountRow(provider: String, isConnected: Boolean, isProcessing: Boolean, onLink: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = provider, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                Text(
                    text = if (isConnected) "Connected" else "Not connected",
                    color = if (isConnected) DesignTokens.Colors.Semantic.success else DesignTokens.Colors.Text.muted,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            GlassButton(
                text = if (isConnected) "Disconnect" else "Connect",
                onClick = onLink,
                isPrimary = !isConnected,
                enabled = !isProcessing,
            )
        }
    }
}

@Composable
private fun AccountsErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
