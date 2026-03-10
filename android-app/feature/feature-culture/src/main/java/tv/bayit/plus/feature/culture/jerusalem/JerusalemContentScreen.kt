package tv.bayit.plus.feature.culture.jerusalem

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
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
import tv.bayit.plus.core.model.CultureContent
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

private const val GRID_COLUMNS = 2

@Composable
fun JerusalemContentRoute(
    onNavigateToContent: (String, String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: JerusalemContentViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    JerusalemContentScreen(
        uiState = uiState,
        onContentClick = { item ->
            onNavigateToContent(item.id, item.category.orEmpty())
        },
        onNavigateBack = onNavigateBack,
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun JerusalemContentScreen(
    uiState: JerusalemContentUiState,
    onContentClick: (CultureContent) -> Unit,
    onNavigateBack: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("culture.jerusalem.title"),
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
            is JerusalemContentUiState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    GlassLoadingIndicator()
                }
            }

            is JerusalemContentUiState.Success -> {
                PullToRefreshBox(
                    isRefreshing = uiState.isRefreshing,
                    onRefresh = onRefresh,
                ) {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(GRID_COLUMNS),
                        contentPadding = PaddingValues(DesignTokens.Spacing.base),
                        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(
                            items = uiState.items,
                            key = { it.id },
                        ) { item ->
                            JerusalemContentGridItem(
                                item = item,
                                onClick = { onContentClick(item) },
                            )
                        }
                    }
                }
            }

            is JerusalemContentUiState.Error -> JerusalemContentErrorSection(
                message = uiState.message,
                onRetry = onRefresh,
            )
        }
    }
}

@Composable
private fun JerusalemContentGridItem(
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
private fun JerusalemContentErrorSection(
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
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
