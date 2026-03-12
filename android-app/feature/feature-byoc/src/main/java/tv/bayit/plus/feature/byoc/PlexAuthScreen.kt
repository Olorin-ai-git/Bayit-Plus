package tv.bayit.plus.feature.byoc

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.byoc.models.PlexServer
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun PlexAuthRoute(
    onNavigateBack: () -> Unit,
    onSuccess: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PlexAuthViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.startAuth() }
    LaunchedEffect(uiState) {
        if (uiState is PlexAuthUiState.Success) onSuccess()
    }

    PlexAuthScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onServerSelected = viewModel::selectServer,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun PlexAuthScreen(
    uiState: PlexAuthUiState,
    onNavigateBack: () -> Unit,
    onServerSelected: (PlexServer) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("byoc.plex.connectPlex"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = bayitString("common.back"),
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )
        when (uiState) {
            is PlexAuthUiState.Idle -> GlassLoadingIndicator()
            is PlexAuthUiState.WaitingForCode -> DeviceCodeContent(
                code = uiState.code,
                verificationUrl = uiState.verificationUrl,
            )
            is PlexAuthUiState.SelectServer -> ServerSelectionContent(
                servers = uiState.servers,
                onServerSelected = onServerSelected,
            )
            is PlexAuthUiState.Connecting -> ConnectingContent(serverName = uiState.serverName)
            is PlexAuthUiState.Success -> SuccessContent()
            is PlexAuthUiState.Error -> ErrorContent(message = uiState.message, onRetry = onRetry)
        }
    }
}

@Composable
private fun DeviceCodeContent(code: String, verificationUrl: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = bayitString("byoc.plex.enterCodeAt"),
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.Colors.Text.secondary,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = verificationUrl,
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Primary.light,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
        GlassCard(modifier = Modifier.padding(horizontal = DesignTokens.Spacing.xl)) {
            Text(
                text = code,
                style = MaterialTheme.typography.displayMedium,
                color = DesignTokens.Colors.Text.primary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(DesignTokens.Spacing.lg),
            )
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
        GlassLoadingIndicator()
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        Text(
            text = bayitString("byoc.plex.waitingForAuth"),
            style = MaterialTheme.typography.bodySmall,
            color = DesignTokens.Colors.Text.secondary,
        )
    }
}

@Composable
private fun ServerSelectionContent(
    servers: List<PlexServer>,
    onServerSelected: (PlexServer) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.lg),
    ) {
        Text(
            text = bayitString("byoc.plex.selectServer"),
            style = MaterialTheme.typography.headlineSmall,
            color = DesignTokens.Colors.Text.primary,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            items(servers, key = { it.id }) { server ->
                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onServerSelected(server) },
                ) {
                    Column(modifier = Modifier.padding(DesignTokens.Spacing.md)) {
                        Text(
                            text = server.name,
                            style = MaterialTheme.typography.titleMedium,
                            color = DesignTokens.Colors.Text.primary,
                        )
                        val connectionLabel = when {
                            server.connections.any { it.isLocal } -> bayitString("byoc.plex.localServer")
                            else -> bayitString("byoc.plex.remoteServer")
                        }
                        Text(
                            text = connectionLabel,
                            style = MaterialTheme.typography.bodySmall,
                            color = DesignTokens.Colors.Text.secondary,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ConnectingContent(serverName: String) {
    Column(Modifier.fillMaxSize(), Arrangement.Center, Alignment.CenterHorizontally) {
        GlassLoadingIndicator()
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        Text(bayitString("byoc.plex.connecting", mapOf("serverName" to serverName)), style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Text.secondary)
    }
}

@Composable
private fun SuccessContent() {
    Column(Modifier.fillMaxSize(), Arrangement.Center, Alignment.CenterHorizontally) {
        Text(bayitString("byoc.plex.connected"), style = MaterialTheme.typography.headlineMedium, color = DesignTokens.Colors.Text.primary)
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(DesignTokens.Spacing.lg), Arrangement.Center, Alignment.CenterHorizontally) {
        Text(message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
        GlassButton(text = bayitString("common.tryAgain"), onClick = onRetry)
    }
}
