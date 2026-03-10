package tv.bayit.plus.feature.podcasts.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

private const val PODCAST_HERO_ASPECT_RATIO = 1f

@Composable
internal fun PodcastHeroSection(state: PodcastDetailUiState.Success, onBack: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().aspectRatio(PODCAST_HERO_ASPECT_RATIO)) {
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
