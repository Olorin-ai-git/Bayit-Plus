package tv.bayit.plus.feature.vod.collection

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import tv.bayit.plus.core.model.CollectionMovie
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val HERO_ASPECT_RATIO = 16f / 9f
private const val POSTER_ASPECT_RATIO = 2f / 3f

@Composable
internal fun CollectionHeroSection(state: CollectionDetailUiState.Success, onBack: () -> Unit) {
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
internal fun CollectionMetadataSection(state: CollectionDetailUiState.Success) {
    Column(modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base)) {
        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            state.availableMovies?.let { available ->
                val total = state.totalMovies ?: available
                Text(
                    text = "$available of $total movies",
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                )
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
internal fun CollectionMovieCard(
    movie: CollectionMovie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(
        modifier = modifier
            .padding(horizontal = DesignTokens.Spacing.xs)
            .clickable(onClick = onClick),
    ) {
        Column {
            CachedAsyncImage(
                url = movie.thumbnail,
                contentDescription = movie.title,
                modifier = Modifier.fillMaxWidth().aspectRatio(POSTER_ASPECT_RATIO),
            )
            Column(modifier = Modifier.padding(DesignTokens.Spacing.xs)) {
                movie.title?.let { title ->
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                    movie.year?.let { year ->
                        Text(year.toString(), style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Text.muted)
                    }
                    movie.duration?.let { duration ->
                        Text(duration, style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Text.muted)
                    }
                }
            }
        }
    }
}

@Composable
internal fun CollectionErrorContent(message: String, onBack: () -> Unit, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
            GlassButton(text = "Go Back", onClick = onBack, isPrimary = false)
        }
    }
}
