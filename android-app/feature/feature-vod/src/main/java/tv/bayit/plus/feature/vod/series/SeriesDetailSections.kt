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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.EpisodeItem
import tv.bayit.plus.core.model.RelatedItem
import tv.bayit.plus.core.model.SeasonSummary
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val HERO_ASPECT_RATIO = 16f / 9f
private val EPISODE_THUMBNAIL_WIDTH = 160.dp
private const val EPISODE_THUMBNAIL_RATIO = 16f / 9f

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
        Text(
            text = state.title,
            style = MaterialTheme.typography.headlineLarge,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.BottomStart).padding(DesignTokens.Spacing.base),
        )
    }
}

@Composable
internal fun SeriesMetadataSection(state: SeriesDetailUiState.Success) {
    Column(modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base)) {
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            state.year?.let { Text(it.toString(), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary) }
            state.rating?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.gold) }
        }
        state.genre?.let { genre ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(genre, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted)
        }
        state.description?.let { desc ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(desc, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
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

@Composable
internal fun EpisodeRow(episode: EpisodeItem, onPlay: () -> Unit, modifier: Modifier = Modifier) {
    GlassCard(
        modifier = modifier.fillMaxWidth().padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.xs),
    ) {
        Row(modifier = Modifier.fillMaxWidth().clickable(onClick = onPlay), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.width(EPISODE_THUMBNAIL_WIDTH)) {
                CachedAsyncImage(url = episode.thumbnail, contentDescription = episode.title, modifier = Modifier.aspectRatio(EPISODE_THUMBNAIL_RATIO))
            }
            Column(modifier = Modifier.weight(1f).padding(start = DesignTokens.Spacing.md)) {
                Text(buildEpisodeLabel(episode), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                episode.duration?.let { duration ->
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))
                    Text(duration, style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Text.muted)
                }
                GlassButton(text = "Play", onClick = onPlay, modifier = Modifier.padding(top = DesignTokens.Spacing.sm))
            }
        }
    }
}

private fun buildEpisodeLabel(episode: EpisodeItem): String {
    val prefix = episode.episodeNumber?.let { "E$it" }
    return listOfNotNull(prefix, episode.title).joinToString(" - ").ifEmpty { "Episode" }
}

@Composable
internal fun SeriesRelatedShelf(related: List<RelatedItem>, onRelatedClick: (String) -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier.padding(top = DesignTokens.Spacing.lg)) {
        Text("Related", style = MaterialTheme.typography.titleMedium, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base))
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        LazyRow(contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.base), horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            items(items = related, key = { it.id }) { item ->
                GlassCard(modifier = Modifier.width(140.dp)) {
                    Column(modifier = Modifier.clickable { onRelatedClick(item.id) }) {
                        CachedAsyncImage(url = item.thumbnail, contentDescription = item.title, modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f))
                        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                        item.title?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = DesignTokens.Spacing.xs)) }
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))
    }
}

@Composable
internal fun SeriesErrorContent(message: String, onBack: () -> Unit, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
            GlassButton(text = "Go Back", onClick = onBack, isPrimary = false)
        }
    }
}
