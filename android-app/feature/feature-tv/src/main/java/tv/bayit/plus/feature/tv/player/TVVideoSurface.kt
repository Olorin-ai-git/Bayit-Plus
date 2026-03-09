package tv.bayit.plus.feature.tv.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import androidx.tv.material3.Text
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.design.TVDesignTokens

@Composable
internal fun VideoSurface(
    player: ExoPlayer,
    modifier: Modifier = Modifier,
) {
    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                this.player = player
                useController = false
            }
        },
        modifier = modifier,
    )
}

@Composable
internal fun PlaybackErrorOverlay(
    visible: Boolean,
    isLive: Boolean,
    modifier: Modifier = Modifier,
) {
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(DesignTokens.Colors.Glass.bgStrong),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = if (isLive) "Connection lost - retrying..."
                    else "Connection lost - check your network",
                color = DesignTokens.Colors.Semantic.error,
                fontSize = TVDesignTokens.FontSize.title,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}
