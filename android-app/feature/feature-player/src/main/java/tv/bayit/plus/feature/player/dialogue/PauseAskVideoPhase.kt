package tv.bayit.plus.feature.player.dialogue

import android.net.Uri
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Video playback composable for USER_SPEAKING, TRANSITION, and CHARACTER_SPEAKING phases.
 *
 * Renders two ExoPlayer instances in circular clips: one for the user's
 * avatar lip-sync video and one for the character's response video.
 * Phase transitions are driven by [Player.Listener] on STATE_ENDED.
 */
@Composable
internal fun PauseAskVideoPhase(
    phase: PauseAskPhase,
    response: PauseAskResponse,
    onPhaseAdvance: (PauseAskPhase) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            VideoCircleWithState(
                videoUrl = response.userAnimatedVideoUrl.ifEmpty { null },
                isActivePhase = phase == PauseAskPhase.USER_SPEAKING,
                onVideoEnded = { onPhaseAdvance(PauseAskPhase.TRANSITION) },
            )
            VideoCircleWithState(
                videoUrl = response.characterAnimatedVideoUrl.ifEmpty { null },
                isActivePhase = phase == PauseAskPhase.CHARACTER_SPEAKING,
                onVideoEnded = { onPhaseAdvance(PauseAskPhase.IDLE) },
            )
        }

        if (phase == PauseAskPhase.TRANSITION) {
            LaunchedEffect(Unit) {
                delay(TRANSITION_DELAY_MS)
                onPhaseAdvance(PauseAskPhase.CHARACTER_SPEAKING)
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        Text(
            text = response.characterResponseText,
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.sm,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun VideoCircleWithState(
    videoUrl: String?,
    isActivePhase: Boolean,
    onVideoEnded: () -> Unit,
) {
    if (videoUrl == null) {
        EmptyCirclePlaceholder()
        return
    }

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
                        Player.STATE_ENDED -> onVideoEnded()
                        else -> Unit
                    }
                }
                override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                    hasError = true
                    onVideoEnded()
                }
            })
            prepare()
            playWhenReady = isActivePhase
        }
    }

    LaunchedEffect(isActivePhase) {
        if (isActivePhase && !exoPlayer.isPlaying) {
            exoPlayer.play()
        }
    }

    DisposableEffect(videoUrl) { onDispose { exoPlayer.release() } }

    Box(
        modifier = Modifier.size(AVATAR_CIRCLE_SIZE).clip(CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (hasError) {
            Text(
                text = "!",
                color = DesignTokens.Colors.Text.muted,
                fontSize = DesignTokens.FontSize.lg,
            )
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

@Composable
private fun EmptyCirclePlaceholder() {
    Box(
        modifier = Modifier.size(AVATAR_CIRCLE_SIZE).clip(CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        GlassSpinner(size = SpinnerSize.SMALL)
    }
}

private const val TRANSITION_DELAY_MS = 500L
