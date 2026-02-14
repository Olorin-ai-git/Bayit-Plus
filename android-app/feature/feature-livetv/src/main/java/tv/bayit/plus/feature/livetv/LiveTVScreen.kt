package tv.bayit.plus.feature.livetv

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun LiveTVRoute(
    onNavigateToPlayer: (String, String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: LiveTVViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LiveTVScreen(
        uiState = uiState,
        onChannelClick = { channel ->
            onNavigateToPlayer(channel.id, "live_tv")
        },
        onCategorySelected = viewModel::selectCategory,
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun LiveTVScreen(
    uiState: LiveTVUiState,
    onChannelClick: (LiveChannelItem) -> Unit,
    onCategorySelected: (String?) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is LiveTVUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is LiveTVUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                modifier = modifier,
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    if (uiState.categories.isNotEmpty()) {
                        CategoryFilterRow(
                            categories = uiState.categories,
                            selectedCategory = uiState.selectedCategory,
                            onCategorySelected = onCategorySelected,
                        )
                    }
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(DesignTokens.Spacing.base),
                        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(
                            items = uiState.filteredChannels,
                            key = { it.id },
                        ) { channel ->
                            ChannelGridItem(
                                channel = channel,
                                onClick = { onChannelClick(channel) },
                            )
                        }
                    }
                }
            }
        }
        is LiveTVUiState.Error -> LiveTVErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}
