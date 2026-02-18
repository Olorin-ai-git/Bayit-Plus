package tv.bayit.plus.core.voice

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import tv.bayit.plus.core.common.logging.BayitLogger
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/**
 * On-device speech recognition service wrapping Android SpeechRecognizer.
 *
 * Android port of iOS SpeechRecognitionService.swift. Uses [callbackFlow]
 * to emit [SpeechResult] values (partial and final) and returns a stop
 * closure for the caller to cancel recognition.
 */
@Singleton
class SpeechRecognitionService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) {

    /** Check current microphone permission status without prompting. */
    fun checkPermissions(): VoicePermissions {
        val mic = ContextCompat.checkSelfPermission(
            context, Manifest.permission.RECORD_AUDIO,
        ) == PackageManager.PERMISSION_GRANTED
        val recognizerAvailable = SpeechRecognizer.isRecognitionAvailable(context)
        return VoicePermissions(
            microphone = mic,
            speechRecognition = recognizerAvailable,
        )
    }

    /**
     * Start streaming speech recognition for the given language.
     *
     * @param language ISO 639-1 code ("he", "en", "es", etc.)
     * @return A pair of the results [Flow] and a stop closure.
     * @throws SpeechRecognitionException if permissions are missing or
     *         the recognizer is unavailable on this device.
     */
    fun startRecognition(language: String): Pair<Flow<SpeechResult>, () -> Unit> {
        val permissions = checkPermissions()
        if (!permissions.microphone) {
            throw SpeechRecognitionException(SpeechErrorKind.MICROPHONE_PERMISSION_DENIED)
        }
        if (!permissions.speechRecognition) {
            throw SpeechRecognitionException(SpeechErrorKind.RECOGNIZER_UNAVAILABLE)
        }

        val locale = resolveLocale(language)
        var recognizer: SpeechRecognizer? = null

        val flow = callbackFlow {
            val sr = SpeechRecognizer.createSpeechRecognizer(context)
            recognizer = sr

            sr.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    logger.info(
                        "Speech recognition ready",
                        mapOf("language" to language, "locale" to locale.toLanguageTag()),
                    )
                }

                override fun onBeginningOfSpeech() {
                    logger.debug("Speech input detected")
                }

                override fun onRmsChanged(rmsdB: Float) { /* volume meter, intentionally no-op */ }
                override fun onBufferReceived(buffer: ByteArray?) { /* raw audio buffer, unused */ }
                override fun onEndOfSpeech() {
                    logger.debug("End of speech input")
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    val texts = partialResults
                        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val partial = texts?.firstOrNull() ?: return
                    trySend(SpeechResult(transcription = partial, isFinal = false, confidence = 0f))
                }

                override fun onResults(results: Bundle?) {
                    val texts = results
                        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val scores = results
                        ?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)
                    val final_ = texts?.firstOrNull() ?: return
                    val confidence = scores?.firstOrNull() ?: 0f
                    trySend(SpeechResult(transcription = final_, isFinal = true, confidence = confidence))
                    close()
                }

                override fun onError(error: Int) {
                    val kind = mapRecognizerError(error)
                    logger.error(
                        "Speech recognition error",
                        metadata = mapOf("errorCode" to error.toString(), "kind" to kind.name),
                    )
                    close(SpeechRecognitionException(kind))
                }

                override fun onEvent(eventType: Int, params: Bundle?) {
                    logger.debug("Speech event", mapOf("eventType" to eventType.toString()))
                }
            })

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale.toLanguageTag())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            }

            sr.startListening(intent)
            logger.info("Speech recognition started", mapOf("language" to language))

            awaitClose {
                sr.stopListening()
                sr.destroy()
                logger.info("Speech recognition stopped", mapOf("language" to language))
            }
        }

        val stop: () -> Unit = {
            recognizer?.stopListening()
            recognizer?.destroy()
            recognizer = null
        }

        return Pair(flow, stop)
    }

    companion object {
        private val LOCALE_MAP = mapOf(
            "he" to Locale("he", "IL"),
            "es" to Locale("es", "ES"),
            "fr" to Locale("fr", "FR"),
            "zh" to Locale("zh", "CN"),
            "it" to Locale("it", "IT"),
            "ja" to Locale("ja", "JP"),
        )
        private val DEFAULT_LOCALE = Locale("en", "US")

        internal fun resolveLocale(languageCode: String): Locale =
            LOCALE_MAP[languageCode] ?: DEFAULT_LOCALE

        private fun mapRecognizerError(errorCode: Int): SpeechErrorKind = when (errorCode) {
            SpeechRecognizer.ERROR_AUDIO -> SpeechErrorKind.AUDIO_ERROR
            SpeechRecognizer.ERROR_CLIENT -> SpeechErrorKind.CLIENT_ERROR
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> SpeechErrorKind.MICROPHONE_PERMISSION_DENIED
            SpeechRecognizer.ERROR_NETWORK -> SpeechErrorKind.NETWORK_ERROR
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> SpeechErrorKind.NETWORK_TIMEOUT
            SpeechRecognizer.ERROR_NO_MATCH -> SpeechErrorKind.NO_MATCH
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> SpeechErrorKind.RECOGNIZER_BUSY
            SpeechRecognizer.ERROR_SERVER -> SpeechErrorKind.SERVER_ERROR
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> SpeechErrorKind.SPEECH_TIMEOUT
            else -> SpeechErrorKind.UNKNOWN
        }
    }
}

/** Error kinds for speech recognition failures. */
enum class SpeechErrorKind(val message: String) {
    MICROPHONE_PERMISSION_DENIED("Microphone permission not granted"),
    RECOGNIZER_UNAVAILABLE("Speech recognizer unavailable on this device"),
    AUDIO_ERROR("Audio recording error"),
    CLIENT_ERROR("Client-side error"),
    NETWORK_ERROR("Network error during recognition"),
    NETWORK_TIMEOUT("Network timeout during recognition"),
    NO_MATCH("No speech match found"),
    RECOGNIZER_BUSY("Speech recognizer is busy"),
    SERVER_ERROR("Server error during recognition"),
    SPEECH_TIMEOUT("No speech input detected"),
    UNKNOWN("Unknown speech recognition error"),
}

/** Exception wrapping a [SpeechErrorKind] for structured error handling. */
class SpeechRecognitionException(
    val kind: SpeechErrorKind,
) : Exception(kind.message)
