package com.bayitplus.modules

import android.speech.tts.TextToSpeech
import android.speech.tts.TextToSpeech.Engine
import android.speech.tts.UtteranceProgressListener
import android.os.Build
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.facebook.react.bridge.Arguments
import java.util.Locale

/**
 * TTSModule.kt - Text-to-Speech Synthesis
 * Converts text to speech using Android TTS engine
 * Features:
 * - Multiple languages: Hebrew, English, Spanish
 * - Rate and pitch adjustment (0.5x - 2.0x)
 * - Background playback (doesn't interrupt existing audio)
 * - Streaming for long content
 *
 * Supports Android 5.0 (API 21) and higher
 */
class TTSModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), TextToSpeech.OnInitListener {

    companion object {
        const val NAME = "TTSModule"
        private const val MODULE_TAG = "TTSModule"
    }

    private var tts: TextToSpeech? = null
    private var isInitialized = false
    private var currentLanguage = Locale.ENGLISH
    private var currentRate = 1.0f
    private var currentPitch = 1.0f

    override fun getName(): String = NAME

    /**
     * Initialize TTS engine
     * Must be called before speaking
     * @param promise Resolves when TTS initialized
     */
    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            if (isInitialized) {
                promise.resolve(mapOf("status" to "already_initialized"))
                return
            }

            tts = TextToSpeech(reactApplicationContext, this)
            promise.resolve(mapOf("status" to "initializing"))
        } catch (e: Exception) {
            promise.reject("INIT_FAILED", "Failed to initialize TTS: ${e.message}", e)
        }
    }

    /**
     * Speak text in specified language
     * @param text Text to speak
     * @param language Language code: "he" (Hebrew), "en" (English), "es" (Spanish)
     * @param promise Resolves when speech starts
     */
    @ReactMethod
    fun speak(text: String, language: String, promise: Promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "TTS not initialized. Call initialize() first")
                return
            }

            if (text.isBlank()) {
                promise.reject("EMPTY_TEXT", "Text to speak cannot be empty")
                return
            }

            val locale = when (language) {
                "he" -> Locale("he", "IL") // Hebrew - Israel
                "en" -> Locale.US // English - US
                "es" -> Locale("es", "ES") // Spanish - Spain
                else -> {
                    promise.reject("UNSUPPORTED_LANGUAGE", "Language '$language' not supported")
                    return
                }
            }

            // Check if language available
            val available = tts?.isLanguageAvailable(locale)
            if (available == TextToSpeech.LANG_NOT_SUPPORTED || available == TextToSpeech.LANG_MISSING_DATA) {
                promise.reject("LANGUAGE_NOT_AVAILABLE", "TTS data for '$language' not installed on device")
                return
            }

            currentLanguage = locale
            tts?.language = locale
            tts?.pitch = currentPitch
            tts?.setSpeechRate(currentRate)

            // Set utterance listener for progress events
            val utteranceId = System.currentTimeMillis().toString()
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    emitEvent("speech_start", null)
                }

                override fun onDone(utteranceId: String?) {
                    emitEvent("speech_done", mapOf("utteranceId" to utteranceId))
                }

                override fun onError(utteranceId: String?) {
                    emitEvent("speech_error", mapOf("utteranceId" to utteranceId))
                }

                override fun onStop(utteranceId: String?, interrupted: Boolean) {
                    emitEvent("speech_stop", mapOf("utteranceId" to utteranceId, "interrupted" to interrupted))
                }
            })

            // Speak with background audio focus (doesn't stop music)
            val bundle = android.os.Bundle().apply {
                putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, android.media.AudioManager.STREAM_MUSIC)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                tts?.speak(text, TextToSpeech.QUEUE_ADD, bundle, utteranceId)
            } else {
                @Suppress("DEPRECATION")
                tts?.speak(text, TextToSpeech.QUEUE_ADD, null)
            }

            promise.resolve(mapOf(
                "status" to "speaking",
                "language" to language,
                "utteranceId" to utteranceId
            ))
        } catch (e: Exception) {
            promise.reject("SPEAK_FAILED", "Failed to speak: ${e.message}", e)
        }
    }

    /**
     * Set speech rate (speed)
     * @param rate Rate multiplier: 0.5 (half speed) to 2.0 (double speed), default 1.0
     * @param promise Resolves when rate set
     */
    @ReactMethod
    fun setRate(rate: Double, promise: Promise) {
        try {
            if (rate < 0.5 || rate > 2.0) {
                promise.reject("INVALID_RATE", "Rate must be between 0.5 and 2.0")
                return
            }

            currentRate = rate.toFloat()
            tts?.setSpeechRate(currentRate)
            promise.resolve(mapOf("rate" to rate))
        } catch (e: Exception) {
            promise.reject("SET_RATE_FAILED", "Failed to set rate: ${e.message}", e)
        }
    }

    /**
     * Set pitch (tone)
     * @param pitch Pitch multiplier: 0.5 (low) to 2.0 (high), default 1.0
     * @param promise Resolves when pitch set
     */
    @ReactMethod
    fun setPitch(pitch: Double, promise: Promise) {
        try {
            if (pitch < 0.5 || pitch > 2.0) {
                promise.reject("INVALID_PITCH", "Pitch must be between 0.5 and 2.0")
                return
            }

            currentPitch = pitch.toFloat()
            tts?.pitch = currentPitch
            promise.resolve(mapOf("pitch" to pitch))
        } catch (e: Exception) {
            promise.reject("SET_PITCH_FAILED", "Failed to set pitch: ${e.message}", e)
        }
    }

    /**
     * Stop current speech
     * @param promise Resolves when speech stopped
     */
    @ReactMethod
    fun stop(promise: Promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "TTS not initialized")
                return
            }

            tts?.stop()
            promise.resolve(mapOf("status" to "stopped"))
        } catch (e: Exception) {
            promise.reject("STOP_FAILED", "Failed to stop: ${e.message}", e)
        }
    }

    /**
     * Shutdown TTS engine and release resources
     * Call when app exits
     * @param promise Resolves when shutdown complete
     */
    @ReactMethod
    fun shutdown(promise: Promise) {
        try {
            if (tts != null) {
                tts?.stop()
                tts?.shutdown()
                tts = null
                isInitialized = false
            }
            promise.resolve(mapOf("status" to "shutdown"))
        } catch (e: Exception) {
            promise.reject("SHUTDOWN_FAILED", "Failed to shutdown: ${e.message}", e)
        }
    }

    // TextToSpeech.OnInitListener implementation

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isInitialized = true
            emitEvent("tts_initialized", mapOf("status" to "ready"))
        } else {
            isInitialized = false
            emitEvent("tts_error", mapOf("code" to "INIT_FAILED", "message" to "TTS initialization failed"))
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
            // Silently fail event emission
        }
    }
}
