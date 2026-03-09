package tv.bayit.plus.feature.tv.player

import android.view.KeyEvent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.delay
import tv.bayit.plus.feature.tv.design.TVDesignTokens
import tv.bayit.plus.feature.tv.watchnext.WatchNextManager
import tv.bayit.plus.feature.tv.watchnext.WatchNextSyncWorker

private const val POSITION_POLL_MS = 1000L
private const val SEEK_MS = 10_000L
private const val WATCH_NEXT_DELTA_MS = 30_000L
private const val RETRY_MS = 5000L

@Composable
fun TVPlayerRoute(
    contentId: String,
    contentType: String,
    resumePositionMs: Long,
    streamUrl: String,
    onBack: () -> Unit,
    watchNextManager: WatchNextManager? = null,
    title: String = contentId,
    thumbnailUri: String = "",
    description: String = "",
) {
    val context = LocalContext.current
    val focusRequester = remember { FocusRequester() }
    val player = remember {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(streamUrl))
            prepare()
            seekTo(resumePositionMs)
            playWhenReady = true
        }
    }

    var isPlaying by remember { mutableStateOf(true) }
    var positionMs by remember { mutableLongStateOf(resumePositionMs) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var controlsVisible by remember { mutableStateOf(true) }
    var lastWnUpdateMs by remember { mutableLongStateOf(resumePositionMs) }
    var playbackError by remember { mutableStateOf(false) }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) { isPlaying = playing }
            override fun onPlayerError(error: PlaybackException) { playbackError = true }
            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_READY) playbackError = false
            }
        }
        player.addListener(listener)
        onDispose { player.removeListener(listener); player.release() }
    }

    LaunchedEffect(playbackError, contentType) {
        if (playbackError && contentType == "live") {
            while (playbackError) { delay(RETRY_MS); player.prepare() }
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            positionMs = player.currentPosition
            durationMs = player.duration.coerceAtLeast(0L)
            if (watchNextManager != null && durationMs > 0) {
                val progress = positionMs.toFloat() / durationMs.toFloat()
                val delta = kotlin.math.abs(positionMs - lastWnUpdateMs)
                if (watchNextManager.shouldRemove(progress)) {
                    watchNextManager.remove(contentId); lastWnUpdateMs = positionMs
                } else if (watchNextManager.shouldInsert(progress) && delta >= WATCH_NEXT_DELTA_MS) {
                    watchNextManager.insertOrUpdate(
                        contentId, title, description, thumbnailUri,
                        contentType, positionMs, durationMs,
                    )
                    lastWnUpdateMs = positionMs
                }
            }
            delay(POSITION_POLL_MS)
        }
    }

    LaunchedEffect(controlsVisible) {
        if (controlsVisible) { delay(TVDesignTokens.Player.controlsAutoHideMs); controlsVisible = false }
    }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> player.pause()
                Lifecycle.Event.ON_START -> { if (isPlaying) player.play() }
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            WatchNextSyncWorker.enqueueSingleSync(context)
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black)
            .focusRequester(focusRequester).focusable()
            .onKeyEvent { event ->
                if (event.nativeKeyEvent.action != KeyEvent.ACTION_DOWN) return@onKeyEvent false
                when (event.nativeKeyEvent.keyCode) {
                    KeyEvent.KEYCODE_BACK -> {
                        if (controlsVisible) controlsVisible = false else onBack(); true
                    }
                    else -> { if (!controlsVisible) { controlsVisible = true; true } else false }
                }
            },
    ) {
        VideoSurface(player = player, modifier = Modifier.fillMaxSize())

        AnimatedVisibility(visible = controlsVisible, enter = fadeIn(), exit = fadeOut()) {
            TVPlayerControls(
                isPlaying = isPlaying,
                currentPositionMs = positionMs,
                durationMs = durationMs,
                title = title,
                onPlayPause = { if (player.isPlaying) player.pause() else player.play() },
                onSeekBack = { player.seekTo((player.currentPosition - SEEK_MS).coerceAtLeast(0L)) },
                onSeekForward = {
                    player.seekTo((player.currentPosition + SEEK_MS).coerceAtMost(player.duration.coerceAtLeast(0L)))
                },
            )
        }

        PlaybackErrorOverlay(visible = playbackError, isLive = contentType == "live")
    }
}
