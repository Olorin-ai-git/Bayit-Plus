package tv.bayit.plus.feature.radio

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.RadioStationItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun RadioRoute(
    onNavigateToPlayer: (String, String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: RadioViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    RadioScreen(
        uiState = uiState,
        onStationClick = { station -> onNavigateToPlayer(station.id, "radio") },
        onFavoriteToggle = viewModel::toggleFavorite,
        onRefresh = viewModel::refresh,
        modifier = modifier,
    )
}

@Composable
internal fun RadioScreen(
    uiState: RadioUiState,
    onStationClick: (RadioStationItem) -> Unit,
    onFavoriteToggle: (String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is RadioUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is RadioUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                modifier = modifier,
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    uiState.nowPlayingStationId?.let { playingId ->
                        val playingStation = uiState.stations.firstOrNull { it.id == playingId }
                        if (playingStation != null) {
                            NowPlayingBar(station = playingStation)
                        }
                    }
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(DesignTokens.Spacing.base),
                        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(
                            items = uiState.stations,
                            key = { it.id },
                        ) { station ->
                            RadioGridItem(
                                station = station,
                                isFavorite = station.id in uiState.favoriteIds,
                                onClick = { onStationClick(station) },
                                onFavoriteClick = { onFavoriteToggle(station.id) },
                            )
                        }
                    }
                }
            }
        }
        is RadioUiState.Error -> RadioErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}

@Composable
private fun NowPlayingBar(
    station: RadioStationItem,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.fillMaxWidth().padding(horizontal = DesignTokens.Spacing.base)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CachedAsyncImage(
                url = station.logo,
                contentDescription = station.name,
                modifier = Modifier
                    .width(DesignTokens.Spacing.xxxxl)
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(DesignTokens.Radius.sm)),
            )
            Spacer(modifier = Modifier.width(DesignTokens.Spacing.md))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Now Playing",
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Primary.light,
                )
                station.name?.let { name ->
                    Text(
                        text = name,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                station.currentSong?.let { song ->
                    Text(
                        text = song,
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.Colors.Text.secondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
private fun RadioGridItem(
    station: RadioStationItem,
    isFavorite: Boolean,
    onClick: () -> Unit,
    onFavoriteClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.clickable(onClick = onClick)) {
        Column {
            CachedAsyncImage(
                url = station.logo,
                contentDescription = station.name,
                modifier = Modifier.fillMaxWidth().aspectRatio(1f),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            station.name?.let { name ->
                Text(
                    text = name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            station.genre?.let { genre ->
                Text(
                    text = genre,
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.secondary,
                    maxLines = 1,
                )
            }
            station.currentShow?.let { show ->
                Text(
                    text = show,
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            GlassButton(
                text = if (isFavorite) "Favorited" else "Favorite",
                onClick = onFavoriteClick,
                isPrimary = !isFavorite,
            )
        }
    }
}

@Composable
private fun RadioErrorSection(
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
