package tv.bayit.plus.feature.vod.collection

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val GRID_COLUMNS = 2

/**
 * Navigation entry-point for the Collection Detail screen.
 */
@Composable
fun CollectionDetailRoute(
    onNavigateToMovie: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CollectionDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    CollectionDetailScreen(
        uiState = uiState,
        onMovieClick = onNavigateToMovie,
        onBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun CollectionDetailScreen(
    uiState: CollectionDetailUiState,
    onMovieClick: (String) -> Unit,
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
            is CollectionDetailUiState.Loading -> GlassLoadingIndicator()
            is CollectionDetailUiState.Error -> CollectionErrorContent(uiState.message, onBack, onRetry)
            is CollectionDetailUiState.Success -> CollectionSuccessContent(
                state = uiState,
                onMovieClick = onMovieClick,
                onBack = onBack,
            )
        }
    }
}

@Composable
private fun CollectionSuccessContent(
    state: CollectionDetailUiState.Success,
    onMovieClick: (String) -> Unit,
    onBack: () -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(GRID_COLUMNS),
        contentPadding = PaddingValues(bottom = DesignTokens.Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        modifier = Modifier.fillMaxSize(),
    ) {
        item(span = { GridItemSpan(GRID_COLUMNS) }) {
            CollectionHeroSection(state, onBack)
        }
        item(span = { GridItemSpan(GRID_COLUMNS) }) {
            CollectionMetadataSection(state)
        }
        items(items = state.movies, key = { it.id }) { movie ->
            CollectionMovieCard(movie = movie, onClick = { onMovieClick(movie.id) })
        }
    }
}
