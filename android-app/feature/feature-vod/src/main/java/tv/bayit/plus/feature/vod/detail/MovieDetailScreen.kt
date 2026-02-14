package tv.bayit.plus.feature.vod.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Navigation entry-point for the Movie Detail screen.
 */
@Composable
fun MovieDetailRoute(
    onNavigateToPlayer: (String) -> Unit,
    onNavigateToRelated: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MovieDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    MovieDetailScreen(
        uiState = uiState,
        onPlay = { movieId -> onNavigateToPlayer(movieId) },
        onRelatedClick = onNavigateToRelated,
        onFavoriteToggle = viewModel::toggleFavorite,
        onBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun MovieDetailScreen(
    uiState: MovieDetailUiState,
    onPlay: (String) -> Unit,
    onRelatedClick: (String) -> Unit,
    onFavoriteToggle: () -> Unit,
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
            is MovieDetailUiState.Loading -> GlassLoadingIndicator()
            is MovieDetailUiState.Error -> MovieErrorContent(uiState.message, onBack, onRetry)
            is MovieDetailUiState.Success -> MovieSuccessContent(
                state = uiState,
                onPlay = onPlay,
                onRelatedClick = onRelatedClick,
                onFavoriteToggle = onFavoriteToggle,
                onBack = onBack,
            )
        }
    }
}

@Composable
private fun MovieSuccessContent(
    state: MovieDetailUiState.Success,
    onPlay: (String) -> Unit,
    onRelatedClick: (String) -> Unit,
    onFavoriteToggle: () -> Unit,
    onBack: () -> Unit,
) {
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item { MovieHeroSection(state, onBack, onFavoriteToggle) }
        item { MovieMetadataSection(state) }
        item { MovieActionSection(state.movieId, onPlay) }
        if (state.related.isNotEmpty()) {
            item {
                RelatedContentShelf(
                    related = state.related,
                    onRelatedClick = onRelatedClick,
                )
            }
        }
    }
}
