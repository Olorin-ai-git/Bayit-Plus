package tv.bayit.plus.feature.vod.series

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.EpisodeItem
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Navigation entry-point for the Series Detail screen.
 */
@Composable
fun SeriesDetailRoute(
    onNavigateToPlayer: (String) -> Unit,
    onNavigateToRelated: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SeriesDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    SeriesDetailScreen(
        uiState = uiState,
        onEpisodePlay = onNavigateToPlayer,
        onSeasonSelected = viewModel::selectSeason,
        onDownloadAll = viewModel::downloadAllEpisodes,
        onEpisodeDownload = viewModel::downloadEpisode,
        onRelatedClick = onNavigateToRelated,
        onBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun SeriesDetailScreen(
    uiState: SeriesDetailUiState,
    onEpisodePlay: (String) -> Unit,
    onSeasonSelected: (Int) -> Unit,
    onDownloadAll: () -> Unit,
    onEpisodeDownload: (EpisodeItem) -> Unit,
    onRelatedClick: (String) -> Unit,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        when (uiState) {
            is SeriesDetailUiState.Loading -> GlassLoadingIndicator()
            is SeriesDetailUiState.Error -> SeriesErrorContent(uiState.message, onBack, onRetry)
            is SeriesDetailUiState.Success -> SeriesSuccessContent(
                state = uiState,
                onEpisodePlay = onEpisodePlay,
                onSeasonSelected = onSeasonSelected,
                onDownloadAll = onDownloadAll,
                onEpisodeDownload = onEpisodeDownload,
                onRelatedClick = onRelatedClick,
                onBack = onBack,
            )
        }
    }
}

@Composable
private fun SeriesSuccessContent(
    state: SeriesDetailUiState.Success,
    onEpisodePlay: (String) -> Unit,
    onSeasonSelected: (Int) -> Unit,
    onDownloadAll: () -> Unit,
    onEpisodeDownload: (EpisodeItem) -> Unit,
    onRelatedClick: (String) -> Unit,
    onBack: () -> Unit,
) {
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item { SeriesHeroSection(state, onBack) }
        item { SeriesMetadataSection(state, onDownloadAll) }
        if (state.seasons.isNotEmpty()) {
            item {
                SeasonTabRow(
                    seasons = state.seasons,
                    selectedSeason = state.selectedSeason,
                    onSeasonSelected = onSeasonSelected,
                )
            }
        }
        if (state.isLoadingEpisodes) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(DesignTokens.Spacing.xxxxl),
                    contentAlignment = Alignment.Center,
                ) {
                    GlassSpinner(size = SpinnerSize.MEDIUM)
                }
            }
        } else {
            items(items = state.episodes, key = { it.id }) { episode ->
                EpisodeRow(
                    episode = episode,
                    onPlay = { onEpisodePlay(episode.id) },
                    onDownload = { onEpisodeDownload(episode) },
                )
            }
        }
        if (state.related.isNotEmpty()) {
            item {
                SeriesRelatedShelf(
                    related = state.related,
                    onRelatedClick = onRelatedClick,
                )
            }
        }
    }
}
