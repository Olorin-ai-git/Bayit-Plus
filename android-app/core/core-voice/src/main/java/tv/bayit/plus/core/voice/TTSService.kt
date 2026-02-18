package tv.bayit.plus.core.voice

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import tv.bayit.plus.core.common.logging.BayitLogger
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/** Text-to-speech service using Android's [TextToSpeech] API.
 *  Android port of iOS BayitVoice/TTSService.swift. */
@Singleton
class TTSService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) {
    private var ttsEngine: TextToSpeech? = null
    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking
    private val _isInitialized = MutableStateFlow(false)
    val isInitialized: StateFlow<Boolean> = _isInitialized

    init {
        ttsEngine = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                _isInitialized.value = true
                logger.info("TTS engine initialized")
            } else {
                _isInitialized.value = false
                logger.error("TTS engine init failed", metadata = mapOf("status" to status.toString()))
            }
        }
        ttsEngine?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                _isSpeaking.value = true
            }

            override fun onDone(utteranceId: String?) {
                _isSpeaking.value = false
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                _isSpeaking.value = false
                logger.error(
                    "TTS utterance error",
                    metadata = mapOf("utteranceId" to (utteranceId ?: "unknown")),
                )
            }

            override fun onError(utteranceId: String?, errorCode: Int) {
                _isSpeaking.value = false
                logger.error(
                    "TTS utterance error",
                    metadata = mapOf(
                        "utteranceId" to (utteranceId ?: "unknown"),
                        "errorCode" to errorCode.toString(),
                    ),
                )
            }
        })
    }

    /** Speak [text] in the given [language] (ISO 639-1) at the specified [rate] (0.5-2.0). */
    fun speak(text: String, language: String, rate: Float = 1.0f) {
        val engine = ttsEngine ?: return
        if (!_isInitialized.value) {
            logger.warning("TTS engine not initialized, ignoring speak request")
            return
        }
        stop()

        val locale = localeForCode(language)
        val langResult = engine.setLanguage(locale)
        if (langResult == TextToSpeech.LANG_MISSING_DATA ||
            langResult == TextToSpeech.LANG_NOT_SUPPORTED
        ) {
            logger.warning(
                "TTS language not supported",
                mapOf("language" to language, "locale" to locale.toString()),
            )
        }
        engine.setSpeechRate(mapRate(rate))
        val utteranceId = UUID.randomUUID().toString()
        engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
        logger.info("Speaking", mapOf("language" to language, "length" to text.length.toString()))
    }

    /** Stop any current speech immediately. */
    fun stop() {
        ttsEngine?.stop()
        _isSpeaking.value = false
    }

    /** List available voices for a given [language] (ISO 639-1 code). */
    fun availableVoices(language: String): List<TTSVoiceInfo> {
        val engine = ttsEngine ?: return emptyList()
        val voices = engine.voices ?: return emptyList()
        val locale = localeForCode(language)
        return voices
            .filter { it.locale.language == locale.language }
            .map { voice ->
                TTSVoiceInfo(
                    id = voice.name,
                    name = voice.name,
                    language = voice.locale.toLanguageTag(),
                    quality = mapQuality(voice),
                )
            }
    }

    /** Set a specific voice by its [voiceId] (name from [availableVoices]). */
    fun setVoice(voiceId: String) {
        val engine = ttsEngine ?: return
        val voices = engine.voices ?: return
        val selected = voices.firstOrNull { it.name == voiceId }
        if (selected != null) {
            engine.voice = selected
            logger.info("TTS voice set", mapOf("voiceId" to voiceId))
        } else {
            logger.warning("TTS voice not found", mapOf("voiceId" to voiceId))
        }
    }

    /** Release the TTS engine. Call when the service is no longer needed. */
    fun shutdown() {
        ttsEngine?.stop()
        ttsEngine?.shutdown()
        ttsEngine = null
        _isSpeaking.value = false
        _isInitialized.value = false
        logger.info("TTS engine shut down")
    }

    companion object {
        private val LOCALE_MAP = mapOf(
            "he" to Locale("he", "IL"),
            "en" to Locale("en", "US"),
            "es" to Locale("es", "ES"),
            "fr" to Locale("fr", "FR"),
            "zh" to Locale("zh", "CN"),
            "it" to Locale("it", "IT"),
            "ja" to Locale("ja", "JP"),
            "hi" to Locale("hi", "IN"),
            "ta" to Locale("ta", "IN"),
            "bn" to Locale("bn", "IN"),
        )
        private val DEFAULT_LOCALE = Locale("en", "US")

        /** Map ISO 639-1 language code to an Android [Locale]. Falls back to en-US. */
        internal fun localeForCode(code: String): Locale = LOCALE_MAP[code] ?: DEFAULT_LOCALE

        /** Clamp user-facing rate (0.5-2.0) to Android TTS speech rate bounds. */
        internal fun mapRate(rate: Float): Float = rate.coerceIn(0.5f, 2.0f)

        /** Infer voice quality tier from Android [Voice] quality score. */
        internal fun mapQuality(voice: Voice): TTSVoiceQuality {
            val quality = voice.quality
            return when {
                quality >= Voice.QUALITY_VERY_HIGH -> TTSVoiceQuality.PREMIUM
                quality >= Voice.QUALITY_HIGH -> TTSVoiceQuality.ENHANCED
                else -> TTSVoiceQuality.STANDARD
            }
        }
    }
}
