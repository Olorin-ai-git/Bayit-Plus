package tv.bayit.plus.feature.audiobooks.detail

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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import tv.bayit.plus.core.model.AudiobookChapter
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val HERO_ASPECT_RATIO = 2f / 3f

@Composable
internal fun AudiobookHeroSection(state: AudiobookDetailUiState.Success, onBack: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().aspectRatio(HERO_ASPECT_RATIO)) {
        CachedAsyncImage(
            url = state.backdrop ?: state.thumbnail,
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
                contentDescription = bayitString("common.back"),
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
internal fun AudiobookMetadataSection(state: AudiobookDetailUiState.Success) {
    Column(modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base)) {
        state.author?.let { author ->
            Text(bayitString("audiobooks.detail.byAuthor", mapOf("author" to author)), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
        }
        state.narrator?.let { narrator ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))
            Text(bayitString("audiobooks.detail.narratedBy", mapOf("narrator" to narrator)), style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted)
        }
        state.duration?.let { duration ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))
            Text(duration, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted)
        }
        state.description?.let { desc ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            Text(desc, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
        }
    }
}

@Composable
internal fun AudiobookActionSection(audiobookId: String, bookmarkCount: Int, onPlay: (String) -> Unit) {
    Column(
        modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.md),
    ) {
        GlassButton(text = bayitString("common.play"), onClick = { onPlay(audiobookId) }, modifier = Modifier.fillMaxWidth())
        if (bookmarkCount > 0) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = bayitString("audiobooks.detail.bookmarks", mapOf("count" to bookmarkCount.toString())),
                style = MaterialTheme.typography.labelSmall,
                color = DesignTokens.Colors.Text.muted,
            )
        }
    }
}

@Composable
internal fun ChapterListHeader(chapterCount: Int) {
    Text(
        text = bayitString("audiobooks.detail.chapters", mapOf("count" to chapterCount.toString())),
        style = MaterialTheme.typography.titleMedium,
        color = DesignTokens.Colors.Text.primary,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.sm),
    )
}

@Composable
internal fun ChapterRow(chapter: AudiobookChapter, onPlay: () -> Unit, modifier: Modifier = Modifier) {
    val chapterFallback = bayitString("audiobooks.detail.chapter")
    val chapterTitle = chapter.title ?: chapterFallback
    val playLabel = bayitString("common.play")

    GlassCard(
        modifier = modifier.fillMaxWidth().padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.xs),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth()
                .semantics { contentDescription = chapterTitle }
                .clickable(onClick = onPlay)
                .padding(DesignTokens.Spacing.sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = chapterTitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                chapter.startTime?.let { startTime ->
                    Text(
                        text = formatTimestamp(startTime),
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.Colors.Text.muted,
                    )
                }
            }
            GlassButton(text = playLabel, onClick = onPlay)
        }
    }
}

/**
 * Formats a timestamp in seconds to MM:SS or HH:MM:SS display string.
 */
internal fun formatTimestamp(seconds: Double): String {
    val totalSeconds = seconds.toLong()
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val secs = totalSeconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, secs)
    } else {
        String.format("%d:%02d", minutes, secs)
    }
}

@Composable
internal fun AudiobookErrorContent(message: String, onBack: () -> Unit, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
            GlassButton(text = bayitString("common.back"), onClick = onBack, isPrimary = false)
        }
    }
}
