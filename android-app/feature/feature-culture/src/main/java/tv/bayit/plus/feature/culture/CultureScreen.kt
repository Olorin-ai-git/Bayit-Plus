package tv.bayit.plus.feature.culture

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
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
import tv.bayit.plus.core.model.CultureContent
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val GRID_COLUMNS = 2

@Composable
fun CultureRoute(
    onNavigateToContent: (String, String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CultureViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    CultureScreen(
        uiState = uiState,
        onContentClick = { item ->
            onNavigateToContent(item.id, item.category.orEmpty())
        },
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun CultureScreen(
    uiState: CultureUiState,
    onContentClick: (CultureContent) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is CultureUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is CultureUiState.Success -> {
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
                        key = "culture_header",
                        span = { GridItemSpan(GRID_COLUMNS) },
                    ) {
                        CultureHeader()
                    }
                    items(
                        items = uiState.items,
                        key = { it.id },
                    ) { item ->
                        CultureGridItem(
                            item = item,
                            onClick = { onContentClick(item) },
                        )
                    }
                }
            }
        }
        is CultureUiState.Error -> CultureErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}

@Composable
private fun CultureHeader(modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Text(
                text = "Israeli Culture",
                style = MaterialTheme.typography.headlineMedium,
                color = DesignTokens.Colors.Primary.light,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = "Jerusalem, Tel Aviv, and Israeli heritage",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun CultureGridItem(
    item: CultureContent,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.clickable(onClick = onClick)) {
        Column {
            CachedAsyncImage(
                url = item.thumbnailUrl,
                contentDescription = item.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(DesignTokens.Spacing.xxxl * 3),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = item.title,
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            item.city?.let { city ->
                Text(
                    text = city,
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Primary.light,
                    maxLines = 1,
                )
            }
            item.description?.let { desc ->
                Text(
                    text = desc,
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.secondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun CultureErrorSection(
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
