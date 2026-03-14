package tv.bayit.plus.feature.vod.detail

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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
    val context = LocalContext.current

    MovieDetailScreen(
        uiState = uiState,
        onPlay = { movieId -> onNavigateToPlayer(movieId) },
        onRelatedClick = onNavigateToRelated,
        onFavoriteToggle = viewModel::toggleFavorite,
        onDownload = viewModel::startDownload,
        onBack = onNavigateBack,
        onRetry = viewModel::retry,
        onTrailerClick = { url ->
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse(url), "video/mp4")
            }
            context.startActivity(intent)
        },
        modifier = modifier,
    )
}

@Composable
internal fun MovieDetailScreen(
    uiState: MovieDetailUiState,
    onPlay: (String) -> Unit,
    onRelatedClick: (String) -> Unit,
    onFavoriteToggle: () -> Unit,
    onDownload: () -> Unit,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onTrailerClick: (String) -> Unit,
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
                onDownload = onDownload,
                onBack = onBack,
                onTrailerClick = onTrailerClick,
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
    onDownload: () -> Unit,
    onBack: () -> Unit,
    onTrailerClick: (String) -> Unit,
) {
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item { MovieHeroSection(state, onBack, onFavoriteToggle) }
        item { MovieMetadataSection(state) }
        item {
            MovieActionSection(
                movieId = state.movieId,
                isDownloading = state.isDownloading,
                isDownloaded = state.isDownloaded,
                hasTrailer = state.hasTrailer,
                duration = state.duration,
                onPlay = onPlay,
                onDownload = onDownload,
                onTrailerClick = { state.trailerStreamUrl?.let { onTrailerClick(it) } },
            )
        }
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
