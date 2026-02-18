package tv.bayit.plus.feature.podcasts.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val HERO_ASPECT_RATIO = 1f
private val EPISODE_THUMBNAIL_WIDTH = 80.dp

@Composable
internal fun PodcastHeroSection(state: PodcastDetailUiState.Success, onBack: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().aspectRatio(HERO_ASPECT_RATIO)) {
        CachedAsyncImage(
            url = state.cover,
            contentDescription = state.title,
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            modifier = Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    colors = listOf(Color.Transparent, DesignTokens.Colors.Background.primary),
                ),
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
internal fun PodcastMetadataSection(state: PodcastDetailUiState.Success) {
    Column(modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base)) {
        state.author?.let { author ->
            Text(author, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            state.category?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted) }
            state.episodeCount?.let { Text("$it episodes", style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted) }
        }
        state.description?.let { desc ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(desc, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
        }
    }
}

@Composable
internal fun PodcastActionSection(
    isSubscribed: Boolean,
    onPlayLatest: () -> Unit,
    onSubscribeToggle: () -> Unit,
) {
    Column(
        modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.md),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        GlassButton(
            text = bayitString("podcasts.playLatest"),
            onClick = onPlayLatest,
            modifier = Modifier.fillMaxWidth(),
        )
        GlassButton(
            text = if (isSubscribed) {
                bayitString("podcasts.unsubscribe")
            } else {
                bayitString("podcasts.subscribe")
            },
            onClick = onSubscribeToggle,
            isPrimary = false,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
internal fun PodcastEpisodeRow(episode: PodcastEpisodeItem, onPlay: () -> Unit, modifier: Modifier = Modifier) {
    GlassCard(
        modifier = modifier.fillMaxWidth().padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.xs),
    ) {
        Row(modifier = Modifier.fillMaxWidth().clickable(onClick = onPlay), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.width(EPISODE_THUMBNAIL_WIDTH)) {
                CachedAsyncImage(url = episode.thumbnail, contentDescription = episode.title, modifier = Modifier.aspectRatio(1f))
            }
            Column(modifier = Modifier.weight(1f).padding(start = DesignTokens.Spacing.md)) {
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
                    Text(duration, style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Text.muted)
                }
                GlassButton(text = "Play", onClick = onPlay, modifier = Modifier.padding(top = DesignTokens.Spacing.sm))
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
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
            GlassButton(text = "Go Back", onClick = onBack, isPrimary = false)
        }
    }
}
