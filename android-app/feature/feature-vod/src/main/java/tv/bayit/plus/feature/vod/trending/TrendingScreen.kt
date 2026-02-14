package tv.bayit.plus.feature.vod.trending

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
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

private const val GRID_COLUMNS = 3

@Composable
fun TrendingRoute(
    onNavigateToContent: (String, String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TrendingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    TrendingScreen(
        uiState = uiState,
        onContentClick = { item ->
            val type = item.type ?: if (item.isSeries == true) "series" else "movie"
            onNavigateToContent(item.id, type)
        },
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun TrendingScreen(
    uiState: TrendingUiState,
    onContentClick: (ContentItem) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is TrendingUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is TrendingUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                modifier = modifier,
            ) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(GRID_COLUMNS),
                    contentPadding = PaddingValues(DesignTokens.Spacing.base),
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    item(
                        key = "trending_header",
                        span = { GridItemSpan(GRID_COLUMNS) },
                    ) {
                        TrendingHeader()
                    }
                    if (uiState.mostWatched.isNotEmpty()) {
                        item(
                            key = "most_watched_label",
                            span = { GridItemSpan(GRID_COLUMNS) },
                        ) {
                            Text(
                                text = "Most Watched",
                                style = MaterialTheme.typography.titleMedium,
                                color = DesignTokens.Colors.Text.primary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = DesignTokens.Spacing.sm),
                            )
                        }
                    }
                    items(
                        items = uiState.mostWatched,
                        key = { it.id },
                    ) { item ->
                        TrendingGridItem(
                            item = item,
                            onClick = { onContentClick(item) },
                        )
                    }
                }
            }
        }
        is TrendingUiState.Error -> TrendingErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}

@Composable
private fun TrendingHeader(modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Text(
                text = "Trending Now",
                style = MaterialTheme.typography.headlineMedium,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = "Popular topics and most watched content",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun TrendingGridItem(
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
                    .aspectRatio(2f / 3f),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            item.title?.let { title ->
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            item.year?.let { year ->
                Text(
                    text = year.toString(),
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.muted,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun TrendingErrorSection(
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
