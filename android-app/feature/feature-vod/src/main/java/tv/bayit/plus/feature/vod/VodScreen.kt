package tv.bayit.plus.feature.vod

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.vod.components.CollectionBanner
import java.util.Locale

@Composable
fun VodRoute(
    onNavigateToContent: (String, String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: VodViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    VodScreen(
        uiState = uiState,
        onContentClick = { item ->
            val type = item.type ?: if (item.isSeries == true) "series" else "movie"
            onNavigateToContent(item.id, type)
        },
        onCollectionClick = { collectionId -> onNavigateToContent(collectionId, "collection") },
        onCategorySelected = viewModel::selectCategory,
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun VodScreen(
    uiState: VodUiState,
    onContentClick: (ContentItem) -> Unit,
    onCollectionClick: (String) -> Unit,
    onCategorySelected: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is VodUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is VodUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                modifier = modifier,
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    if (uiState.categories.isNotEmpty()) {
                        VodCategoryTabRow(
                            categories = uiState.categories,
                            selectedCategoryId = uiState.selectedCategoryId,
                            onCategorySelected = onCategorySelected,
                        )
                    }
                    if (uiState.featuredCollections.isNotEmpty() && uiState.selectedCategoryId == null) {
                        CollectionBanner(
                            collections = uiState.featuredCollections,
                            onCollectionClick = onCollectionClick,
                            currentLanguage = Locale.getDefault().language,
                        )
                    }
                    if (uiState.isLoadingContent) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center,
                        ) {
                            GlassSpinner(size = SpinnerSize.MEDIUM)
                        }
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(3),
                            contentPadding = PaddingValues(DesignTokens.Spacing.base),
                            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            items(
                                items = uiState.contentItems,
                                key = { it.id },
                            ) { item ->
                                VodGridItem(
                                    item = item,
                                    onClick = { onContentClick(item) },
                                )
                            }
                        }
                    }
                }
            }
        }
        is VodUiState.Error -> VodErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}
