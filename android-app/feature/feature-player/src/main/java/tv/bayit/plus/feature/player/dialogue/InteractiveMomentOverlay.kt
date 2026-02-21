package tv.bayit.plus.feature.player.dialogue

import android.graphics.Matrix
import android.graphics.Outline
import android.net.Uri
import android.view.TextureView
import android.view.View
import android.view.ViewOutlineProvider
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.VideoSize
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Auto-triggered overlay for interactive moments during VOD playback.
 *
 * Uses TextureView (not SurfaceView/PlayerView) so circular clipping works.
 * Applies a center-crop Matrix transform so video fills the circle without distortion.
 */
@Composable
fun InteractiveMomentOverlay(
    moment: InteractiveMoment?,
    mainPlayer: Player?,
    avatarImageUrl: String?,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var phase by remember { mutableStateOf(MomentOverlayPhase.AVATAR_SPEAKING) }
    LaunchedEffect(moment?.timestamp) { phase = MomentOverlayPhase.AVATAR_SPEAKING }

    AnimatedVisibility(visible = moment != null, enter = fadeIn(), exit = fadeOut(), modifier = modifier) {
        moment?.let { activeMoment ->
            DuckVolume(mainPlayer = mainPlayer)
            val scope = rememberCoroutineScope()
            val scheduleDismiss: () -> Unit = remember(onDismiss) {
                { scope.launch { delay(DISMISS_DELAY_MS); onDismiss() } }
            }
            val onAvatarEnded: () -> Unit = remember(activeMoment.characterResponseVideoUrl) {
                if (activeMoment.characterResponseVideoUrl != null) {
                    { phase = MomentOverlayPhase.CHARACTER_SPEAKING }
                } else {
                    scheduleDismiss
                }
            }
            Column(
                modifier = Modifier.padding(DesignTokens.Spacing.base),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = activeMoment.characterName,
                    color = DesignTokens.Colors.Primary.light,
                    fontSize = DesignTokens.FontSize.md,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MomentVideoCircle(
                        videoUrl = activeMoment.lipsyncVideoUrl,
                        fallbackImageUrl = avatarImageUrl,
                        shouldPlay = phase == MomentOverlayPhase.AVATAR_SPEAKING,
                        onVideoEnded = onAvatarEnded,
                        onVideoError = scheduleDismiss,
                    )
                    MomentVideoCircle(
                        videoUrl = activeMoment.characterResponseVideoUrl,
                        fallbackImageUrl = activeMoment.characterFrameUrl,
                        shouldPlay = phase == MomentOverlayPhase.CHARACTER_SPEAKING,
                        onVideoEnded = scheduleDismiss,
                        onVideoError = scheduleDismiss,
                    )
                }
            }
        }
    }
}

private enum class MomentOverlayPhase { AVATAR_SPEAKING, CHARACTER_SPEAKING }

@Composable
private fun DuckVolume(mainPlayer: Player?) {
    DisposableEffect(mainPlayer) {
        val previousVolume = mainPlayer?.volume ?: 1f
        mainPlayer?.volume = DUCKED_VOLUME
        onDispose { mainPlayer?.volume = previousVolume }
    }
}

@Composable
private fun MomentVideoCircle(
    videoUrl: String?,
    fallbackImageUrl: String?,
    shouldPlay: Boolean,
    onVideoEnded: () -> Unit,
    onVideoError: () -> Unit,
) {
    Box(
        modifier = Modifier.size(MOMENT_CIRCLE_SIZE).clip(CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (videoUrl != null && shouldPlay) {
            val context = LocalContext.current
            var isReady by remember { mutableStateOf(false) }
            // Plain array holders avoid recomposition side-effects from mutation
            val tvHolder = remember { arrayOfNulls<TextureView>(1) }
            val sizeHolder = remember { arrayOfNulls<VideoSize>(1) }

            val exoPlayer = remember(videoUrl) {
                ExoPlayer.Builder(context).build().apply {
                    setMediaItem(MediaItem.fromUri(Uri.parse(videoUrl)))
                    addListener(object : Player.Listener {
                        override fun onPlaybackStateChanged(state: Int) {
                            if (state == Player.STATE_READY) isReady = true
                            if (state == Player.STATE_ENDED) onVideoEnded()
                        }
                        override fun onPlayerError(error: PlaybackException) { onVideoError() }
                        override fun onVideoSizeChanged(videoSize: VideoSize) {
                            sizeHolder[0] = videoSize
                            tvHolder[0]?.let { applyCenterCrop(it, videoSize) }
                        }
                    })
                    volume = 1.0f
                    prepare(); playWhenReady = true; repeatMode = Player.REPEAT_MODE_OFF
                }
            }
            DisposableEffect(videoUrl) { onDispose { exoPlayer.release() } }
            AndroidView(
                factory = { ctx ->
                    TextureView(ctx).apply {
                        outlineProvider = object : ViewOutlineProvider() {
                            override fun getOutline(view: View, outline: Outline) {
                                outline.setOval(0, 0, view.width, view.height)
                            }
                        }
                        clipToOutline = true
                        tvHolder[0] = this
                        exoPlayer.setVideoTextureView(this)
                        // Re-apply crop after layout if size already known
                        addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
                            sizeHolder[0]?.let { applyCenterCrop(this, it) }
                        }
                    }
                },
                modifier = Modifier.matchParentSize(),
            )
            if (!isReady) {
                if (fallbackImageUrl != null) {
                    CachedAsyncImage(url = fallbackImageUrl, contentDescription = null, modifier = Modifier.matchParentSize())
                } else {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            }
        } else if (fallbackImageUrl != null) {
            CachedAsyncImage(url = fallbackImageUrl, contentDescription = null, modifier = Modifier.matchParentSize())
        } else {
            GlassSpinner(size = SpinnerSize.SMALL)
        }
    }
}

/**
 * Center-crops the TextureView to display the video without distortion.
 * TextureView stretches video to fill by default; this corrects to cover/fill
 * while maintaining the video's natural aspect ratio.
 */
private fun applyCenterCrop(tv: TextureView, videoSize: VideoSize) {
    val vw = videoSize.width.toFloat()
    val vh = videoSize.height.toFloat()
    val tw = tv.width.toFloat()
    val th = tv.height.toFloat()
    if (vw <= 0f || vh <= 0f || tw <= 0f || th <= 0f) return

    val scaleX: Float
    val scaleY: Float
    if (vw * th > tw * vh) {
        scaleX = vw * th / (vh * tw)
        scaleY = 1f
    } else {
        scaleX = 1f
        scaleY = vh * tw / (vw * th)
    }
    val matrix = Matrix()
    matrix.setScale(scaleX, scaleY, tw / 2f, th / 2f)
    tv.setTransform(matrix)
}

private const val DUCKED_VOLUME = 0.05f
private const val DISMISS_DELAY_MS = 300L
private val MOMENT_CIRCLE_SIZE = 120.dp
