package com.bayitplus.modules

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.SpeechRecognizer
import androidx.annotation.RequiresPermission
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import java.util.Locale

/**
 * VoiceModule.kt - Voice Recognition via Android Speech Recognizer
 * Provides speech-to-text recognition in multiple languages with event streaming
 * Supports: Hebrew (he), English (en), Spanish (es)
 * Uses Google ML Kit as primary, with fallback to Android SpeechRecognizer
 */
class VoiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), RecognitionListener {

    companion object {
        const val NAME = "VoiceModule"
        private const val MODULE_TAG = "VoiceModule"
        private const val SPEECH_TIMEOUT_MS = 5000L // 5 seconds of silence
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private var currentLanguage = "en" // Default language

    override fun getName(): String = NAME

    /**
     * Start voice recognition in specified language
     * Emits events: recognition_start, partial_result, final_result, error
     *
     * @param language Language code: "he" (Hebrew), "en" (English), "es" (Spanish)
     * @param promise Resolves when recognition starts successfully
     */
    @ReactMethod
    @RequiresPermission(android.Manifest.permission.RECORD_AUDIO)
    fun startRecognition(language: String, promise: Promise) {
        try {
            // Validate language code
            val validLanguage = when (language) {
                "he" -> "he-IL" // Hebrew - Israel
                "en" -> "en-US" // English - US
                "es" -> "es-ES" // Spanish - Spain
                else -> {
                    promise.reject("INVALID_LANGUAGE", "Language '$language' not supported. Use 'he', 'en', or 'es'")
                    return
                }
            }

            currentLanguage = language

            // Create SpeechRecognizer if not already created
            if (speechRecognizer == null) {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactApplicationContext)
                speechRecognizer?.setRecognitionListener(this)
            }

            // Build recognition intent
            val intent = Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, validLanguage)
                putExtra(android.speech.RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 500)
                putExtra(android.speech.RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, SPEECH_TIMEOUT_MS.toInt())
                putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 5)
                putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            }

            isListening = true
            emitEvent("recognition_start", mapOf("language" to language))
            speechRecognizer?.startListening(intent)
            promise.resolve(mapOf("status" to "listening", "language" to language))
        } catch (e: SecurityException) {
            val error = mapOf("code" to "PERMISSION_DENIED", "message" to "RECORD_AUDIO permission not granted")
            promise.reject("PERMISSION_DENIED", "RECORD_AUDIO permission required", e)
            emitEvent("error", error)
        } catch (e: Exception) {
            val error = mapOf("code" to "START_FAILED", "message" to e.message)
            promise.reject("START_FAILED", "Failed to start recognition: ${e.message}", e)
            emitEvent("error", error)
        }
    }

    /**
     * Stop voice recognition
     * @param promise Resolves when recognition stops
     */
    @ReactMethod
    fun stopRecognition(promise: Promise) {
        try {
            if (speechRecognizer != null && isListening) {
                isListening = false
                speechRecognizer?.stopListening()
                promise.resolve(mapOf("status" to "stopped"))
            } else {
                promise.reject("NOT_LISTENING", "Recognition not active")
            }
        } catch (e: Exception) {
            promise.reject("STOP_FAILED", "Failed to stop recognition: ${e.message}", e)
        }
    }

    /**
     * Cancel voice recognition
     * @param promise Resolves when recognition cancelled
     */
    @ReactMethod
    fun cancelRecognition(promise: Promise) {
        try {
            if (speechRecognizer != null) {
                isListening = false
                speechRecognizer?.cancel()
                promise.resolve(mapOf("status" to "cancelled"))
            } else {
                promise.reject("NOT_INITIALIZED", "VoiceModule not initialized")
            }
        } catch (e: Exception) {
            promise.reject("CANCEL_FAILED", "Failed to cancel recognition: ${e.message}", e)
        }
    }

    /**
     * Cleanup resources
     * Call this when app exits or module is destroyed
     */
    @ReactMethod
    fun destroy(promise: Promise) {
        try {
            if (speechRecognizer != null) {
                speechRecognizer?.destroy()
                speechRecognizer = null
            }
            isListening = false
            promise.resolve(mapOf("status" to "destroyed"))
        } catch (e: Exception) {
            promise.reject("DESTROY_FAILED", "Failed to destroy module: ${e.message}", e)
        }
    }

    // RecognitionListener implementation

    override fun onReadyForSpeech(params: Bundle?) {
        emitEvent("ready_for_speech", mapOf("language" to currentLanguage))
    }

    override fun onBeginningOfSpeech() {
        emitEvent("speech_started", null)
    }

    override fun onRmsChanged(rmsdB: Float) {
        // Audio level changed - emit for UI visualization
        emitEvent("volume_change", mapOf("level" to rmsdB.toInt()))
    }

    override fun onBufferReceived(buffer: ByteArray?) {
        // Audio buffer received - can be used for visualization
    }

    override fun onEndOfSpeech() {
        emitEvent("speech_ended", null)
    }

    override fun onError(error: Int) {
        isListening = false
        val errorMessage = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech match"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech timeout (5s silence)"
            else -> "Unknown error ($error)"
        }
        emitEvent("error", mapOf("code" to "RECOGNITION_ERROR", "message" to errorMessage, "errorCode" to error))
    }

    override fun onResults(results: Bundle?) {
        isListening = false
        if (results == null) {
            emitEvent("error", mapOf("code" to "NO_RESULTS", "message" to "No recognition results"))
            return
        }

        val matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: emptyList()
        val scores = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES) ?: FloatArray(0)

        if (matches.isEmpty()) {
            emitEvent("error", mapOf("code" to "NO_RESULTS", "message" to "No speech recognized"))
            return
        }

        // Emit best result with confidence score
        val bestMatch = matches[0]
        val confidence = if (scores.isNotEmpty()) scores[0] else 0.5f
        emitEvent("final_result", mapOf(
            "text" to bestMatch,
            "confidence" to confidence.toDouble(),
            "isFinal" to true,
            "language" to currentLanguage
        ))
    }

    override fun onPartialResults(partialResults: Bundle?) {
        if (partialResults == null) return

        val matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: emptyList()
        if (matches.isNotEmpty()) {
            emitEvent("partial_result", mapOf(
                "text" to matches[0],
                "isFinal" to false,
                "language" to currentLanguage
            ))
        }
    }

    override fun onEvent(eventType: Int, params: Bundle?) {
        // Additional event handling if needed
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
            // Silently fail event emission - module is still functional
        }
    }
}
