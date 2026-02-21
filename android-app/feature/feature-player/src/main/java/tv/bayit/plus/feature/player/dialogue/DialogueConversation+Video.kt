package tv.bayit.plus.feature.player.dialogue

import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun CharacterVideoCircle(videoUrl: String) {
    val context = LocalContext.current
    var isReady by remember { mutableStateOf(false) }
    var hasError by remember { mutableStateOf(false) }
    val exoPlayer = remember(videoUrl) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(Uri.parse(videoUrl)))
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    when (state) {
                        Player.STATE_READY -> isReady = true
                        Player.STATE_ENDED -> {}
                        Player.STATE_IDLE -> {}
                        Player.STATE_BUFFERING -> {}
                    }
                }

                override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                    hasError = true
                }
            })
            prepare()
            playWhenReady = true
            repeatMode = Player.REPEAT_MODE_OFF
        }
    }
    DisposableEffect(videoUrl) { onDispose { exoPlayer.release() } }
    Box(
        modifier = Modifier.size(AVATAR_CIRCLE_SIZE).clip(CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (hasError) {
            Box(
                modifier = Modifier.matchParentSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "!",
                    color = DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.lg,
                )
            }
        } else {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply { player = exoPlayer; useController = false }
                },
                modifier = Modifier.matchParentSize(),
            )
            if (!isReady) {
                GlassSpinner(size = SpinnerSize.SMALL)
            }
        }
    }
}
