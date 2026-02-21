package tv.bayit.plus.feature.podcasts

import androidx.compose.foundation.layout.Arrangement
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
import tv.bayit.plus.core.media.AudioPlaybackState
import tv.bayit.plus.core.model.PodcastShow
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun PodcastsRoute(
    onNavigateToPodcast: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PodcastsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val audioState by viewModel.audioState.collectAsStateWithLifecycle()

    PodcastsScreen(
        uiState = uiState,
        audioState = audioState,
        onShowClick = { show -> onNavigateToPodcast(show.id) },
        onTogglePlayback = viewModel::togglePlayback,
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun PodcastsScreen(
    uiState: PodcastsUiState,
    audioState: AudioPlaybackState,
    onShowClick: (PodcastShow) -> Unit,
    onTogglePlayback: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is PodcastsUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is PodcastsUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                modifier = modifier,
            ) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(DesignTokens.Spacing.base),
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(
                        items = uiState.shows,
                        key = { it.id },
                    ) { show ->
                        val isThisPlaying = audioState.isActive &&
                            audioState.contentId == show.id &&
                            audioState.isPlaying
                        PodcastGridItem(
                            show = show,
                            isPlaying = isThisPlaying,
                            onClick = { onShowClick(show) },
                            onTogglePlayback = { onTogglePlayback(show.id) },
                        )
                    }
                }
            }
        }
        is PodcastsUiState.Error -> PodcastsErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}
