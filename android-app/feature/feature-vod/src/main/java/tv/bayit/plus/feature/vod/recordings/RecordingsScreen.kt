package tv.bayit.plus.feature.vod.recordings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun RecordingsRoute(
    onNavigateToPlayer: (String, String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: RecordingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    RecordingsScreen(
        uiState = uiState,
        onRecordingClick = { item ->
            val type = item.type ?: "movie"
            onNavigateToPlayer(item.id, type)
        },
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun RecordingsScreen(
    uiState: RecordingsUiState,
    onRecordingClick: (ContentItem) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is RecordingsUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is RecordingsUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                modifier = modifier,
            ) {
                if (uiState.recordings.isEmpty()) {
                    EmptyRecordingsSection(modifier = Modifier.fillMaxSize())
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(DesignTokens.Spacing.base),
                        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(
                            items = uiState.recordings,
                            key = { it.id },
                        ) { recording ->
                            RecordingGridItem(
                                item = recording,
                                onClick = { onRecordingClick(recording) },
                            )
                        }
                    }
                }
            }
        }
        is RecordingsUiState.Error -> RecordingsErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}

@Composable
private fun RecordingGridItem(
    item: ContentItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.clickable(onClick = onClick)) {
        Column {
            CachedAsyncImage(
                url = item.thumbnail ?: item.backdrop,
                contentDescription = item.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            item.title?.let { title ->
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                item.duration?.let { duration ->
                    Text(
                        text = duration,
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.Colors.Text.muted,
                    )
                }
                item.category?.let { category ->
                    Text(
                        text = category,
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyRecordingsSection(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Text(
                text = "No recordings yet",
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
            )
            Text(
                text = "Your DVR recordings will appear here",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun RecordingsErrorSection(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
