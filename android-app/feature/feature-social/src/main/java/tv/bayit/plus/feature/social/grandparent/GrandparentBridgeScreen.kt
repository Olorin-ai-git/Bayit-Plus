package tv.bayit.plus.feature.social.grandparent

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Route composable for Grandparent Bridge screen.
 * Entry point that creates ViewModel and wires navigation.
 */
@Composable
fun GrandparentBridgeRoute(
    onNavigateToInvite: () -> Unit,
    onNavigateToSharedMoments: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: GrandparentBridgeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    GrandparentBridgeScreen(
        uiState = uiState,
        onNavigateToInvite = onNavigateToInvite,
        onNavigateToSharedMoments = onNavigateToSharedMoments,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::loadConnections,
        modifier = modifier,
    )
}

/**
 * Main Grandparent Bridge screen showing connected grandparents.
 * Allows users to view connections, invite new grandparents, and access shared moments.
 */
@Composable
internal fun GrandparentBridgeScreen(
    uiState: GrandparentBridgeUiState,
    onNavigateToInvite: () -> Unit,
    onNavigateToSharedMoments: (String) -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Grandparent Bridge")

        when (uiState) {
            is GrandparentBridgeUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    GlassLoadingIndicator()
                }
            }

            is GrandparentBridgeUiState.Success -> {
                SuccessContent(
                    connections = uiState.connections,
                    onNavigateToInvite = onNavigateToInvite,
                    onNavigateToSharedMoments = onNavigateToSharedMoments,
                )
            }

            is GrandparentBridgeUiState.Error -> {
                ErrorContent(message = uiState.message, onRetry = onRetry)
            }
        }
    }
}

@Composable
private fun SuccessContent(
    connections: List<Any>,
    onNavigateToInvite: () -> Unit,
    onNavigateToSharedMoments: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.md),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item {
            Text(
                text = "Connected Grandparents",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }

        if (connections.isEmpty()) {
            item {
                EmptyConnectionsState(onNavigateToInvite = onNavigateToInvite)
            }
        } else {
            items(connections) { connection ->
                ConnectionCard(
                    connection = connection,
                    onViewSharedMoments = { onNavigateToSharedMoments("connection-id") },
                )
            }
        }

        item {
            GlassButton(
                text = "Invite Grandparent",
                onClick = onNavigateToInvite,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun EmptyConnectionsState(onNavigateToInvite: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.lg)) {
        Column(
            modifier = Modifier.padding(DesignTokens.Spacing.lg),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = "No connections yet",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "Invite a grandparent to start sharing moments together",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            GlassButton(text = "Invite Grandparent", onClick = onNavigateToInvite)
        }
    }
}

@Composable
private fun ConnectionCard(connection: Any, onViewSharedMoments: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.md),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CachedAsyncImage(
                imageUrl = null,
                contentDescription = "Grandparent avatar",
                modifier = Modifier.size(56.dp).clip(CircleShape),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Grandparent",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "Connected",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            GlassButton(text = "Shared Moments", onClick = onViewSharedMoments)
        }
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.error,
            )
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
