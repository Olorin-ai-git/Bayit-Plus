package tv.bayit.plus.feature.social.grandparent

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun SuccessContent(
    connections: List<Any>,
    onNavigateToInvite: () -> Unit,
    onNavigateToSharedMoments: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.md),
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
                url = null,
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
