package tv.bayit.plus.feature.vod.detail

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
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.CircularProgressIndicator
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
import tv.bayit.plus.core.model.RelatedItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val HERO_ASPECT_RATIO = 16f / 9f
private val RELATED_CARD_WIDTH = 140.dp
private const val RELATED_POSTER_RATIO = 2f / 3f

@Composable
internal fun MovieHeroSection(
    state: MovieDetailUiState.Success,
    onBack: () -> Unit,
    onFavoriteToggle: () -> Unit,
) {
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
        Row(
            modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.sm),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Navigate back",
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(DesignTokens.TouchTarget.minimum),
                )
            }
            IconButton(onClick = onFavoriteToggle) {
                Icon(
                    imageVector = if (state.isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                    contentDescription = if (state.isFavorite) "Remove favorite" else "Add favorite",
                    tint = if (state.isFavorite) DesignTokens.Colors.Semantic.error else DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(DesignTokens.TouchTarget.minimum),
                )
            }
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
internal fun MovieMetadataSection(state: MovieDetailUiState.Success) {
    Column(modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base)) {
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            state.year?.let { Text(it.toString(), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary) }
            state.duration?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary) }
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
internal fun MovieActionSection(
    movieId: String,
    isDownloading: Boolean,
    isDownloaded: Boolean,
    onPlay: (String) -> Unit,
    onDownload: () -> Unit,
) {
    Column(
        modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base, vertical = DesignTokens.Spacing.md),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        GlassButton(text = "Play", onClick = { onPlay(movieId) }, modifier = Modifier.fillMaxWidth())
        Row(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth(),
        ) {
            GlassButton(
                text = when {
                    isDownloaded -> "Downloaded"
                    isDownloading -> "Downloading..."
                    else -> "Download"
                },
                onClick = onDownload,
                isPrimary = false,
                modifier = Modifier.weight(1f),
                enabled = !isDownloading && !isDownloaded,
            )
            if (isDownloading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = DesignTokens.Colors.Primary.base,
                    strokeWidth = 2.dp,
                )
            }
        }
    }
}

@Composable
internal fun RelatedContentShelf(
    related: List<RelatedItem>,
    onRelatedClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.padding(top = DesignTokens.Spacing.lg)) {
        Text(
            text = "Related",
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base),
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.base),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items = related, key = { it.id }) { item ->
                RelatedCard(item = item, onClick = { onRelatedClick(item.id) })
            }
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))
    }
}

@Composable
private fun RelatedCard(item: RelatedItem, onClick: () -> Unit, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.width(RELATED_CARD_WIDTH)) {
        Column(modifier = Modifier.clickable(onClick = onClick)) {
            CachedAsyncImage(
                url = item.thumbnail,
                contentDescription = item.title,
                modifier = Modifier.fillMaxWidth().aspectRatio(RELATED_POSTER_RATIO),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            item.title?.let { title ->
                Text(title, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = DesignTokens.Spacing.xs))
            }
            item.year?.let { year ->
                Text(year.toString(), style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Text.muted, modifier = Modifier.padding(horizontal = DesignTokens.Spacing.xs))
            }
        }
    }
}

@Composable
internal fun MovieErrorContent(message: String, onBack: () -> Unit, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
            GlassButton(text = "Go Back", onClick = onBack, isPrimary = false)
        }
    }
}
