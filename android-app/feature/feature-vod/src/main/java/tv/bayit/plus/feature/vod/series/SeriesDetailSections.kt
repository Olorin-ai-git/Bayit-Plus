package tv.bayit.plus.feature.vod.series

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.SeasonSummary
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val HERO_ASPECT_RATIO = 16f / 9f

@Composable
internal fun SeriesHeroSection(state: SeriesDetailUiState.Success, onBack: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().aspectRatio(HERO_ASPECT_RATIO)) {
        CachedAsyncImage(
            url = state.backdrop ?: state.thumbnail,
            contentDescription = state.title,
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            modifier = Modifier.fillMaxSize().background(
                Brush.verticalGradient(colors = listOf(Color.Transparent, DesignTokens.Colors.Background.primary)),
            ),
        )
        IconButton(
            onClick = onBack,
            modifier = Modifier.align(Alignment.TopStart).padding(DesignTokens.Spacing.sm),
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Navigate back",
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(DesignTokens.TouchTarget.minimum),
            )
        }
        Column(
            modifier = Modifier.align(Alignment.BottomStart).padding(DesignTokens.Spacing.base),
        ) {
            Text(
                text = state.title,
                style = MaterialTheme.typography.headlineLarge,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                state.year?.let { Text(it.toString(), style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.secondary) }
                state.totalSeasons?.let { Text("$it Seasons", style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.secondary) }
                state.totalEpisodes?.let { Text("$it Episodes", style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.secondary) }
            }
        }
    }
}

@Composable
internal fun SeriesMetadataSection(state: SeriesDetailUiState.Success) {
    Column(modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base)) {
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm), verticalAlignment = Alignment.CenterVertically) {
            state.rating?.let { rating ->
                Text(
                    text = rating,
                    style = MaterialTheme.typography.labelMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(DesignTokens.Radius.sm))
                        .background(Color.Black.copy(alpha = 0.7f))
                        .padding(horizontal = DesignTokens.Spacing.sm, vertical = DesignTokens.Spacing.xxs),
                )
            }
        }
        state.genre?.let { genre ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                val genres = genre.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                items(genres) { g ->
                    Text(
                        text = g,
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .clip(RoundedCornerShape(DesignTokens.Radius.full))
                            .background(DesignTokens.Colors.Glass.bg)
                            .padding(horizontal = DesignTokens.Spacing.md, vertical = DesignTokens.Spacing.xs),
                    )
                }
            }
        }
        state.description?.let { desc ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(desc, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
    }
}

@Composable
internal fun SeriesActionRow(isFavorite: Boolean, onToggleFavorite: () -> Unit, onPlayAll: () -> Unit) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            modifier = Modifier
                .clip(RoundedCornerShape(DesignTokens.Radius.full))
                .background(DesignTokens.Colors.Glass.bg)
                .clickable(onClick = onToggleFavorite)
                .padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.sm),
        ) {
            Icon(
                imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                contentDescription = if (isFavorite) "Remove from favorites" else "Add to favorites",
                tint = if (isFavorite) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Text.secondary,
                modifier = Modifier.size(18.dp),
            )
            Text(
                text = if (isFavorite) "Remove from Favorites" else "Add to Favorites",
                style = MaterialTheme.typography.labelMedium,
                color = DesignTokens.Colors.Text.primary,
            )
        }
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            modifier = Modifier
                .clip(RoundedCornerShape(DesignTokens.Radius.full))
                .background(DesignTokens.Colors.Primary.base)
                .clickable(onClick = onPlayAll)
                .padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.sm),
        ) {
            Icon(Icons.Filled.PlayArrow, contentDescription = "Play all", tint = Color.White, modifier = Modifier.size(18.dp))
            Text("Play All", style = MaterialTheme.typography.labelMedium, color = Color.White, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
internal fun SeasonTabRow(seasons: List<SeasonSummary>, selectedSeason: Int, onSeasonSelected: (Int) -> Unit, modifier: Modifier = Modifier) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.base),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        modifier = modifier.padding(vertical = DesignTokens.Spacing.md),
    ) {
        items(items = seasons, key = { it.seasonNumber }) { season ->
            GlassChip(label = "Season ${season.seasonNumber}", isSelected = selectedSeason == season.seasonNumber, onClick = { onSeasonSelected(season.seasonNumber) })
        }
    }
}

