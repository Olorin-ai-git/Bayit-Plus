package tv.bayit.plus.feature.vod.playlist

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import tv.bayit.plus.core.model.PlaylistItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

private const val GRID_COLUMNS = 2

@Composable
fun PlaylistRoute(
    onNavigateToContent: (String, String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PlaylistViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    PlaylistScreen(
        uiState = uiState,
        onItemClick = { item ->
            val type = item.contentType ?: "movie"
            onNavigateToContent(item.contentId, type)
        },
        onNavigateBack = onNavigateBack,
        onRefresh = viewModel::refresh,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun PlaylistScreen(
    uiState: PlaylistUiState,
    onItemClick: (PlaylistItem) -> Unit,
    onNavigateBack: () -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("vod.playlist.title"),
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
            is PlaylistUiState.Loading -> GlassLoadingIndicator()
            is PlaylistUiState.Empty -> PlaylistEmptyContent()
            is PlaylistUiState.Success -> PlaylistGridContent(
                items = uiState.playlists,
                isRefreshing = uiState.isRefreshing,
                onItemClick = onItemClick,
                onRefresh = onRefresh,
            )
            is PlaylistUiState.Error -> PlaylistErrorContent(
                message = uiState.message,
                onRetry = onRetry,
            )
        }
    }
}

@Composable
private fun PlaylistGridContent(
    items: List<PlaylistItem>,
    isRefreshing: Boolean,
    onItemClick: (PlaylistItem) -> Unit,
    onRefresh: () -> Unit,
) {
    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize(),
    ) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(GRID_COLUMNS),
            contentPadding = PaddingValues(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(items = items, key = { it.contentId }) { item ->
                PlaylistGridItem(item = item, onClick = { onItemClick(item) })
            }
        }
    }
}

@Composable
private fun PlaylistGridItem(
    item: PlaylistItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.clickable(onClick = onClick)) {
        Column {
            CachedAsyncImage(
                url = item.thumbnail,
                contentDescription = item.title,
                modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
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
            item.duration?.let { duration ->
                Text(
                    text = duration,
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.muted,
                )
            }
        }
    }
}

@Composable
private fun PlaylistEmptyContent() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Text(
                text = bayitString("vod.playlist.emptyTitle"),
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
            )
            Text(
                text = bayitString("vod.playlist.emptySubtitle"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun PlaylistErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
