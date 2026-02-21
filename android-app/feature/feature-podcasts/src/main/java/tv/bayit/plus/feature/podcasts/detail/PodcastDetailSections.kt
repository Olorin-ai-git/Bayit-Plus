package tv.bayit.plus.feature.podcasts.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
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
import tv.bayit.plus.core.model.PodcastEpisodeItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val HERO_ASPECT_RATIO = 1f
private val EPISODE_THUMBNAIL_WIDTH = 80.dp
private val PLAY_BUTTON_SIZE = 44.dp

// PodcastHeroSection is in PodcastDetailSections+Hero.kt

@Composable
internal fun PodcastMetadataSection(state: PodcastDetailUiState.Success) {
    Column(modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base)) {
        state.author?.let { author ->
            Text(author, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            state.category?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted) }
            state.episodeCount?.let { Text("$it ${bayitString("podcasts.episodes")}", style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted) }
        }
        state.description?.let { desc ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(desc, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
        }
    }
}

@Composable
internal fun PodcastPlaySection(
    isPlaying: Boolean,
    onToggle: () -> Unit,
    onShowSleepTimerPicker: () -> Unit,
) {
    Row(
        modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        GlassButton(
            text = if (isPlaying) bayitString("common.pause") else bayitString("podcasts.playLatest"),
            onClick = onToggle,
            modifier = Modifier.weight(1f),
        )
        IconButton(onClick = onShowSleepTimerPicker) {
            Icon(
                imageVector = Icons.Default.Bedtime,
                contentDescription = bayitString("player.sleepTimer.setTimer"),
                tint = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
internal fun PodcastEpisodeRow(
    episode: PodcastEpisodeItem,
    isPlaying: Boolean,
    onTogglePlayback: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.xs),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(modifier = Modifier.width(EPISODE_THUMBNAIL_WIDTH)) {
                CachedAsyncImage(
                    url = episode.thumbnail,
                    contentDescription = episode.title,
                    modifier = Modifier.aspectRatio(1f),
                )
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = DesignTokens.Spacing.md),
            ) {
                Text(
                    text = buildEpisodeLabel(episode),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                episode.duration?.let { duration ->
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))
                    Text(
                        text = duration,
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.Colors.Text.muted,
                    )
                }
            }
            IconButton(
                onClick = onTogglePlayback,
                modifier = Modifier
                    .size(PLAY_BUTTON_SIZE)
                    .glassMorphism(
                        cornerRadius = PLAY_BUTTON_SIZE / 2,
                        backgroundColor = if (isPlaying) {
                            DesignTokens.Colors.Primary.base
                        } else {
                            DesignTokens.Colors.Glass.bg
                        },
                    ),
            ) {
                Icon(
                    imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isPlaying) {
                        bayitString("common.pause")
                    } else {
                        bayitString("common.play")
                    },
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(24.dp),
                )
            }
        }
    }
}

private fun buildEpisodeLabel(episode: PodcastEpisodeItem): String {
    val prefix = episode.episodeNumber?.let { "E$it" }
    return listOfNotNull(prefix, episode.title).joinToString(" - ").ifEmpty { "Episode" }
}

@Composable
internal fun PodcastErrorContent(message: String, onBack: () -> Unit, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
            GlassButton(text = bayitString("common.goBack"), onClick = onBack, isPrimary = false)
        }
    }
}
