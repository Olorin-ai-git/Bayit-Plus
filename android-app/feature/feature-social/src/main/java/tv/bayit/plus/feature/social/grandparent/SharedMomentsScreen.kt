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
import androidx.compose.foundation.shape.RoundedCornerShape
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
 * Route composable for Shared Moments screen.
 */
@Composable
fun SharedMomentsRoute(
    onPlayContent: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SharedMomentsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    SharedMomentsScreen(
        uiState = uiState,
        onRetry = viewModel::loadSharedContent,
        onPlayContent = onPlayContent,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

/**
 * Screen displaying shared content moments between user and grandparent.
 * Shows a timeline of media items shared in both directions.
 */
@Composable
internal fun SharedMomentsScreen(
    uiState: SharedMomentsUiState,
    onRetry: () -> Unit,
    onPlayContent: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Shared Moments")

        when (uiState) {
            is SharedMomentsUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    GlassLoadingIndicator()
                }
            }

            is SharedMomentsUiState.Error -> {
                ErrorContent(message = uiState.message, onRetry = onRetry)
            }

            is SharedMomentsUiState.Success -> {
                SharedContentList(sharedItems = uiState.sharedContent, onPlayContent = onPlayContent)
            }
        }
    }
}

@Composable
private fun SharedContentList(sharedItems: List<Any>, onPlayContent: (String) -> Unit) {
    if (sharedItems.isEmpty()) {
        EmptySharedState()
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.md),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(sharedItems) { item ->
                SharedItemCard(item = item, onPlay = { onPlayContent("media-id") })
            }
        }
    }
}

@Composable
private fun EmptySharedState() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        GlassCard(modifier = Modifier.padding(DesignTokens.Spacing.lg)) {
            Column(
                modifier = Modifier.padding(DesignTokens.Spacing.lg),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                Text(
                    text = "No shared moments yet",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "Start sharing content to create memories together",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SharedItemCard(item: Any, onPlay: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.md),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CachedAsyncImage(
                imageUrl = null,
                contentDescription = "Content thumbnail",
                modifier = Modifier.size(80.dp).clip(RoundedCornerShape(DesignTokens.BorderRadius.md)),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Shared Content",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "Shared by Grandparent",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "2 hours ago",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            GlassButton(text = "Play", onClick = onPlay)
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
