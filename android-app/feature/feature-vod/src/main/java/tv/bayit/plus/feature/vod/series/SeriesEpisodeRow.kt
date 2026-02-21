package tv.bayit.plus.feature.vod.series

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.EpisodeItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

private val EPISODE_THUMBNAIL_WIDTH = 140.dp
private const val EPISODE_THUMBNAIL_RATIO = 16f / 9f
private val ICON_BUTTON_SIZE = 36.dp

@Composable
internal fun SeriesEpisodeRow(
    episode: EpisodeItem,
    selectedSeason: Int,
    onPlay: () -> Unit,
    onDownload: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.xs),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onPlay),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(modifier = Modifier.width(EPISODE_THUMBNAIL_WIDTH)) {
                CachedAsyncImage(
                    url = episode.thumbnail,
                    contentDescription = episode.title,
                    modifier = Modifier.aspectRatio(EPISODE_THUMBNAIL_RATIO),
                )
            }

            Column(modifier = Modifier.weight(1f).padding(start = DesignTokens.Spacing.md)) {
                episode.episodeNumber?.let { num ->
                    Text(
                        text = "Episode $num",
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.Colors.Text.muted,
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))
                }
                Text(
                    text = buildEpisodeTitle(episode, selectedSeason),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                episode.duration?.let { duration ->
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))
                    Text(duration, style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Text.muted)
                }
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(end = DesignTokens.Spacing.xs),
            ) {
                IconButton(onClick = onDownload, modifier = Modifier.size(ICON_BUTTON_SIZE)) {
                    Icon(
                        imageVector = Icons.Filled.ArrowDownward,
                        contentDescription = "Download episode",
                        tint = DesignTokens.Colors.Text.muted,
                        modifier = Modifier.size(22.dp),
                    )
                }
                Box(
                    modifier = Modifier
                        .size(ICON_BUTTON_SIZE)
                        .clip(CircleShape)
                        .background(DesignTokens.Colors.Primary.base)
                        .clickable(onClick = onPlay),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.PlayArrow,
                        contentDescription = "Play episode",
                        tint = DesignTokens.Colors.Text.primary,
                        modifier = Modifier.size(22.dp),
                    )
                }
            }
        }
    }
}

private fun buildEpisodeTitle(episode: EpisodeItem, season: Int): String {
    val title = episode.title.orEmpty()
    val code = episode.episodeNumber?.let { ep ->
        "S${season.toString().padStart(2, '0')}E${ep.toString().padStart(2, '0')}"
    }
    return listOfNotNull(title, code).joinToString("\n").ifEmpty { "Episode" }
}
