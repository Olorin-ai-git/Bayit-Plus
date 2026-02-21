package tv.bayit.plus.feature.player.dialogue

import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Auto-triggered overlay for interactive moments during VOD playback.
 *
 * Sequential playback (iOS parity): avatar lipsync plays first, then character
 * response. Any video error dismisses after [DISMISS_DELAY_MS] — never instantly.
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
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(DesignTokens.Spacing.base)
                    .glassMorphism(cornerRadius = DesignTokens.Radius.lg, backgroundColor = DesignTokens.Colors.Glass.bgStrong)
                    .padding(DesignTokens.Spacing.base),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
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
                            shouldPlay = phase == MomentOverlayPhase.AVATAR_SPEAKING,
                            onVideoEnded = onAvatarEnded,
                            onVideoError = scheduleDismiss,
                        )
                        MomentVideoCircle(
                            videoUrl = activeMoment.characterResponseVideoUrl,
                            shouldPlay = phase == MomentOverlayPhase.CHARACTER_SPEAKING,
                            onVideoEnded = scheduleDismiss,
                            onVideoError = scheduleDismiss,
                        )
                    }
                    if (phase == MomentOverlayPhase.CHARACTER_SPEAKING) {
                        activeMoment.characterResponseText?.let { text ->
                            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
                            Text(text = text, color = DesignTokens.Colors.Text.secondary, fontSize = DesignTokens.FontSize.sm, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                        }
                    }
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

/**
 * Single video circle. When [shouldPlay] is true, creates an ExoPlayer and starts
 * immediately. When false, shows a spinner (preserves circle space, no wasted
 * player resources). [onVideoError] never fires instantly — callers must schedule
 * dismiss with a delay themselves.
 */
@Composable
private fun MomentVideoCircle(
    videoUrl: String?,
    shouldPlay: Boolean,
    onVideoEnded: () -> Unit,
    onVideoError: () -> Unit,
) {
    Box(modifier = Modifier.size(AVATAR_CIRCLE_SIZE).clip(CircleShape), contentAlignment = Alignment.Center) {
        if (videoUrl != null && shouldPlay) {
            val context = LocalContext.current
            var isReady by remember { mutableStateOf(false) }
            val exoPlayer = remember(videoUrl) {
                ExoPlayer.Builder(context).build().apply {
                    setMediaItem(MediaItem.fromUri(Uri.parse(videoUrl)))
                    addListener(object : Player.Listener {
                        override fun onPlaybackStateChanged(state: Int) {
                            if (state == Player.STATE_READY) isReady = true
                            if (state == Player.STATE_ENDED) onVideoEnded()
                        }
                        override fun onPlayerError(error: PlaybackException) { onVideoError() }
                    })
                    prepare(); playWhenReady = true; repeatMode = Player.REPEAT_MODE_OFF
                }
            }
            DisposableEffect(videoUrl) { onDispose { exoPlayer.release() } }
            AndroidView(
                factory = { ctx -> PlayerView(ctx).apply { player = exoPlayer; useController = false } },
                modifier = Modifier.matchParentSize(),
            )
            if (!isReady) GlassSpinner(size = SpinnerSize.SMALL)
        } else {
            GlassSpinner(size = SpinnerSize.SMALL)
        }
    }
}

private const val DUCKED_VOLUME = 0.15f
private const val DISMISS_DELAY_MS = 300L
