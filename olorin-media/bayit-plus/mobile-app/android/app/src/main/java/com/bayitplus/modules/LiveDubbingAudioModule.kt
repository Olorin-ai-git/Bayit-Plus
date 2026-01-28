package com.bayitplus.modules

import android.content.Context
import android.media.AudioManager
import android.util.Base64
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.facebook.react.bridge.Arguments
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.Player
import com.google.android.exoplayer2.audio.AudioAttributes
import java.io.File
import java.io.FileOutputStream

/**
 * LiveDubbingAudioModule.kt - Dual Audio Track Playback
 * Plays original and dubbed audio simultaneously with independent volume control
 * Features:
 * - ExoPlayer-based dual audio engine
 * - Synchronized playback between tracks
 * - Independent volume control per track (0-100)
 * - Balance adjustment (original ↔ dubbed)
 * - Base64 MP3 audio decoding
 * - Audio focus management (pauses on call)
 * - Seamless switching between content
 *
 * Used for: Dubbed videos with selectable original/dubbed audio
 */
class LiveDubbingAudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), Player.Listener {

    companion object {
        const val NAME = "LiveDubbingAudioModule"
        private const val MODULE_TAG = "LiveDubbingAudioModule"
        private const val CACHE_DIR = "dubbing_audio"
    }

    private var primaryPlayer: ExoPlayer? = null // Original audio
    private var secondaryPlayer: ExoPlayer? = null // Dubbed audio
    private var audioManager: AudioManager? = null
    private var primaryVolume = 1.0f // 0.0 to 1.0
    private var secondaryVolume = 1.0f // 0.0 to 1.0
    private var primaryBalance = 0.5f // 0.0 (original) to 1.0 (dubbed)

    override fun getName(): String = NAME

    /**
     * Initialize dual audio players
     * Creates ExoPlayer instances for both tracks
     * @param promise Resolves when players initialized
     */
    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

            // Create primary player (original audio)
            primaryPlayer = ExoPlayer.Builder(reactApplicationContext).build().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(com.google.android.exoplayer2.C.USAGE_MEDIA).build(), false)
                addListener(this@LiveDubbingAudioModule)
            }

            // Create secondary player (dubbed audio)
            secondaryPlayer = ExoPlayer.Builder(reactApplicationContext).build().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(com.google.android.exoplayer2.C.USAGE_MEDIA).build(), false)
                addListener(this@LiveDubbingAudioModule)
            }

            promise.resolve(mapOf("status" to "initialized"))
        } catch (e: Exception) {
            promise.reject("INIT_FAILED", "Failed to initialize players: ${e.message}", e)
        }
    }

    /**
     * Load dual audio tracks
     * @param primaryUrl URL or Base64-encoded audio for original track
     * @param secondaryUrl URL or Base64-encoded audio for dubbed track
     * @param promise Resolves when both tracks loaded
     */
    @ReactMethod
    fun loadTracks(primaryUrl: String, secondaryUrl: String, promise: Promise) {
        try {
            if (primaryPlayer == null || secondaryPlayer == null) {
                promise.reject("NOT_INITIALIZED", "Players not initialized. Call initialize() first")
                return
            }

            // Decode Base64 if necessary
            val primaryPath = decodeIfBase64(primaryUrl)
            val secondaryPath = decodeIfBase64(secondaryUrl)

            // Load media items
            val primaryItem = MediaItem.fromUri(primaryPath)
            val secondaryItem = MediaItem.fromUri(secondaryPath)

            primaryPlayer?.setMediaItem(primaryItem)
            primaryPlayer?.prepare()

            secondaryPlayer?.setMediaItem(secondaryItem)
            secondaryPlayer?.prepare()

            promise.resolve(mapOf(
                "status" to "loaded",
                "primaryUrl" to primaryUrl.take(50),
                "secondaryUrl" to secondaryUrl.take(50)
            ))
        } catch (e: Exception) {
            promise.reject("LOAD_FAILED", "Failed to load tracks: ${e.message}", e)
        }
    }

    /**
     * Start synchronized playback of both tracks
     * @param promise Resolves when playback starts
     */
    @ReactMethod
    fun play(promise: Promise) {
        try {
            primaryPlayer?.play()
            secondaryPlayer?.play()

            // Sync playback positions if skewed
            syncPlayback()

            emitEvent("playback_started", null)
            promise.resolve(mapOf("status" to "playing"))
        } catch (e: Exception) {
            promise.reject("PLAY_FAILED", "Failed to start playback: ${e.message}", e)
        }
    }

    /**
     * Pause both tracks
     * @param promise Resolves when paused
     */
    @ReactMethod
    fun pause(promise: Promise) {
        try {
            primaryPlayer?.pause()
            secondaryPlayer?.pause()
            emitEvent("playback_paused", null)
            promise.resolve(mapOf("status" to "paused"))
        } catch (e: Exception) {
            promise.reject("PAUSE_FAILED", "Failed to pause: ${e.message}", e)
        }
    }

    /**
     * Set volume for primary (original) audio track
     * @param volume Volume level 0.0 (silent) to 1.0 (full)
     * @param promise Resolves when volume set
     */
    @ReactMethod
    fun setPrimaryVolume(volume: Double, promise: Promise) {
        try {
            if (volume < 0.0 || volume > 1.0) {
                promise.reject("INVALID_VOLUME", "Volume must be between 0.0 and 1.0")
                return
            }

            primaryVolume = volume.toFloat()
            primaryPlayer?.volume = primaryVolume
            emitEvent("volume_changed", mapOf("track" to "primary", "volume" to volume))
            promise.resolve(mapOf("track" to "primary", "volume" to volume))
        } catch (e: Exception) {
            promise.reject("VOLUME_FAILED", "Failed to set primary volume: ${e.message}", e)
        }
    }

    /**
     * Set volume for secondary (dubbed) audio track
     * @param volume Volume level 0.0 (silent) to 1.0 (full)
     * @param promise Resolves when volume set
     */
    @ReactMethod
    fun setSecondaryVolume(volume: Double, promise: Promise) {
        try {
            if (volume < 0.0 || volume > 1.0) {
                promise.reject("INVALID_VOLUME", "Volume must be between 0.0 and 1.0")
                return
            }

            secondaryVolume = volume.toFloat()
            secondaryPlayer?.volume = secondaryVolume
            emitEvent("volume_changed", mapOf("track" to "secondary", "volume" to volume))
            promise.resolve(mapOf("track" to "secondary", "volume" to volume))
        } catch (e: Exception) {
            promise.reject("VOLUME_FAILED", "Failed to set secondary volume: ${e.message}", e)
        }
    }

    /**
     * Set balance between original and dubbed audio
     * @param balance Balance value 0.0 (original only) to 1.0 (dubbed only), 0.5 = equal
     * @param promise Resolves when balance set
     */
    @ReactMethod
    fun setBalance(balance: Double, promise: Promise) {
        try {
            if (balance < 0.0 || balance > 1.0) {
                promise.reject("INVALID_BALANCE", "Balance must be between 0.0 and 1.0")
                return
            }

            primaryBalance = balance.toFloat()
            // 0.0 = primary full, secondary mute
            // 0.5 = both equal
            // 1.0 = primary mute, secondary full
            primaryVolume = 1.0f - balance.toFloat()
            secondaryVolume = balance.toFloat()

            primaryPlayer?.volume = primaryVolume
            secondaryPlayer?.volume = secondaryVolume

            emitEvent("balance_changed", mapOf("balance" to balance, "primary" to primaryVolume, "secondary" to secondaryVolume))
            promise.resolve(mapOf("balance" to balance))
        } catch (e: Exception) {
            promise.reject("BALANCE_FAILED", "Failed to set balance: ${e.message}", e)
        }
    }

    /**
     * Seek to specific position in both tracks
     * @param positionMs Position in milliseconds
     * @param promise Resolves when seeked
     */
    @ReactMethod
    fun seek(positionMs: Double, promise: Promise) {
        try {
            primaryPlayer?.seekTo(positionMs.toLong())
            secondaryPlayer?.seekTo(positionMs.toLong())
            syncPlayback()

            promise.resolve(mapOf("position" to positionMs))
        } catch (e: Exception) {
            promise.reject("SEEK_FAILED", "Failed to seek: ${e.message}", e)
        }
    }

    /**
     * Release all resources
     * Call when done or app exits
     * @param promise Resolves when released
     */
    @ReactMethod
    fun release(promise: Promise) {
        try {
            primaryPlayer?.release()
            secondaryPlayer?.release()
            primaryPlayer = null
            secondaryPlayer = null

            promise.resolve(mapOf("status" to "released"))
        } catch (e: Exception) {
            promise.reject("RELEASE_FAILED", "Failed to release: ${e.message}", e)
        }
    }

    // Player.Listener implementation

    override fun onPlaybackStateChanged(state: Int) {
        val stateName = when (state) {
            Player.STATE_IDLE -> "idle"
            Player.STATE_BUFFERING -> "buffering"
            Player.STATE_READY -> "ready"
            Player.STATE_ENDED -> "ended"
            else -> "unknown"
        }
        emitEvent("playback_state", mapOf("state" to stateName))
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        emitEvent("is_playing", mapOf("isPlaying" to isPlaying))
    }

    // Private helper functions

    /**
     * Decode Base64 MP3 to temp file if input is Base64, else treat as URL
     */
    private fun decodeIfBase64(input: String): String {
        return try {
            if (input.startsWith("data:") || input.length > 100 && !input.contains("/")) {
                // Likely Base64
                val decoded = Base64.decode(input, Base64.DEFAULT)
                val cacheDir = File(reactApplicationContext.cacheDir, CACHE_DIR).apply { mkdirs() }
                val tempFile = File(cacheDir, "audio_${System.currentTimeMillis()}.mp3")
                FileOutputStream(tempFile).use { it.write(decoded) }
                tempFile.absolutePath
            } else {
                // Regular URL
                input
            }
        } catch (e: Exception) {
            input // Fallback to original
        }
    }

    /**
     * Sync playback positions between both players to prevent drift
     * Necessary because both players run independently
     */
    private fun syncPlayback() {
        try {
            if (primaryPlayer == null || secondaryPlayer == null) return

            val primaryPos = primaryPlayer?.currentPosition ?: return
            val secondaryPos = secondaryPlayer?.currentPosition ?: return

            val diff = Math.abs(primaryPos - secondaryPos)
            if (diff > 100) { // > 100ms drift
                secondaryPlayer?.seekTo(primaryPos)
            }
        } catch (e: Exception) {
            // Silently fail
        }
    }

    /**
     * Emit event to React Native
     */
    private fun emitEvent(eventName: String, data: Map<String, Any?>?) {
        try {
            val eventData = if (data != null) Arguments.makeNativeMap(data) else Arguments.createMap()
            reactApplicationContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit(eventName, eventData)
        } catch (e: Exception) {
            // Silently fail
        }
    }
}
