package tv.bayit.plus.feature.podcasts.detail

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
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Navigation entry-point for the Podcast Detail screen.
 */
@Composable
fun PodcastDetailRoute(
    onNavigateToPlayer: (String, String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PodcastDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    PodcastDetailScreen(
        uiState = uiState,
        onEpisodePlay = { episodeId -> onNavigateToPlayer(episodeId, "podcast_episode") },
        onSubscribeToggle = viewModel::toggleSubscription,
        onBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun PodcastDetailScreen(
    uiState: PodcastDetailUiState,
    onEpisodePlay: (String) -> Unit,
    onSubscribeToggle: () -> Unit,
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
            is PodcastDetailUiState.Loading -> GlassLoadingIndicator()
            is PodcastDetailUiState.Error -> PodcastErrorContent(uiState.message, onBack, onRetry)
            is PodcastDetailUiState.Success -> PodcastSuccessContent(
                state = uiState,
                onEpisodePlay = onEpisodePlay,
                onSubscribeToggle = onSubscribeToggle,
                onBack = onBack,
            )
        }
    }
}

@Composable
private fun PodcastSuccessContent(
    state: PodcastDetailUiState.Success,
    onEpisodePlay: (String) -> Unit,
    onSubscribeToggle: () -> Unit,
    onBack: () -> Unit,
) {
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item { PodcastHeroSection(state, onBack) }
        item { PodcastMetadataSection(state) }
        item { PodcastActionSection(state.isSubscribed, onSubscribeToggle) }
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
                PodcastEpisodeRow(episode = episode, onPlay = { onEpisodePlay(episode.id) })
            }
        }
    }
}
