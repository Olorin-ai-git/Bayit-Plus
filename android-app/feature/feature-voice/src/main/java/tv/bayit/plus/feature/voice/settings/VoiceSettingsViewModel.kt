package tv.bayit.plus.feature.voice.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.VoiceRepository
import tv.bayit.plus.core.voice.TTSVoiceInfo
import javax.inject.Inject

@HiltViewModel
class VoiceSettingsViewModel @Inject constructor(
    private val voiceRepository: VoiceRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<VoiceUiState>(VoiceUiState.Loading)
    val uiState: StateFlow<VoiceUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            logger.debug("Loading voice settings")
            when (val result = voiceRepository.getVoiceSettings()) {
                is BayitResult.Success -> {
                    val raw = result.data as? Map<*, *> ?: emptyMap<String, Any>()
                    val settings = VoiceSettingsData(
                        ttsProvider = raw["tts_provider"] as? String ?: TTS_PROVIDER_SYSTEM,
                        selectedVoiceId = raw["voice_id"] as? String ?: "",
                        speechRate = (raw["speed"] as? Number)?.toFloat() ?: SPEECH_RATE_DEFAULT,
                        voiceMode = raw["voice_mode"] as? String ?: VOICE_MODE_FULL,
                        isWakeWordEnabled = raw["wake_word_enabled"] as? Boolean ?: false,
                        wakeWordSensitivity = (raw["wake_word_sensitivity"] as? Number)?.toFloat()
                            ?: WAKE_WORD_SENSITIVITY_DEFAULT,
                        selectedLanguage = raw["language"] as? String ?: LANGUAGE_DEFAULT,
                    )
                    loadAvailableVoices(settings)
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load voice settings", result.exception)
                    _uiState.value = VoiceUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private suspend fun loadAvailableVoices(settings: VoiceSettingsData) {
        when (val voicesResult = voiceRepository.getAvailableVoices(settings.selectedLanguage)) {
            is BayitResult.Success -> {
                val voices = voicesResult.data.filterIsInstance<TTSVoiceInfo>()
                _uiState.value = VoiceUiState.Success(
                    settings = settings,
                    availableVoices = voices,
                    isSaving = false,
                )
                logger.info("Voice settings loaded", mapOf("voices" to voices.size.toString()))
            }
            is BayitResult.Error -> {
                _uiState.value = VoiceUiState.Success(
                    settings = settings,
                    availableVoices = emptyList(),
                    isSaving = false,
                )
                logger.warning("Voices unavailable, continuing without list")
            }
            is BayitResult.Loading -> Unit
        }
    }

    fun updateTtsProvider(provider: String) {
        updateField("tts_provider", provider) { it.copy(ttsProvider = provider) }
    }

    fun updateSpeechRate(rate: Float) {
        val clamped = rate.coerceIn(SPEECH_RATE_MIN, SPEECH_RATE_MAX)
        updateField("speed", clamped) { it.copy(speechRate = clamped) }
    }

    fun updateVoiceMode(mode: String) {
        updateField("voice_mode", mode) { it.copy(voiceMode = mode) }
    }

    fun updateSelectedVoice(voiceId: String) {
        updateField("voice_id", voiceId) { it.copy(selectedVoiceId = voiceId) }
    }

    fun toggleWakeWord(enabled: Boolean) {
        updateField("wake_word_enabled", enabled) { it.copy(isWakeWordEnabled = enabled) }
    }

    fun updateWakeWordSensitivity(sensitivity: Float) {
        val clamped = sensitivity.coerceIn(SENSITIVITY_MIN, SENSITIVITY_MAX)
        updateField("wake_word_sensitivity", clamped) {
            it.copy(wakeWordSensitivity = clamped)
        }
    }

    fun updateLanguage(language: String) {
        val current = _uiState.value as? VoiceUiState.Success ?: return
        val updated = current.settings.copy(selectedLanguage = language)
        _uiState.value = current.copy(settings = updated, isSaving = true)

        viewModelScope.launch {
            logger.debug("Updating voice language", mapOf("language" to language))
            when (voiceRepository.updateVoiceSettings(mapOf("language" to language))) {
                is BayitResult.Success -> {
                    loadAvailableVoices(updated)
                    logger.info("Voice language updated", mapOf("language" to language))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to update voice language")
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = VoiceUiState.Loading
        loadSettings()
    }

    private fun updateField(
        key: String,
        value: Any,
        transform: (VoiceSettingsData) -> VoiceSettingsData,
    ) {
        val current = _uiState.value as? VoiceUiState.Success ?: return
        val updated = transform(current.settings)
        _uiState.value = current.copy(settings = updated, isSaving = true)

        viewModelScope.launch {
            logger.debug("Updating voice setting", mapOf("key" to key))
            when (voiceRepository.updateVoiceSettings(mapOf(key to value))) {
                is BayitResult.Success -> {
                    _uiState.value = current.copy(settings = updated, isSaving = false)
                    logger.info("Voice setting updated", mapOf("key" to key))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to update voice setting", metadata = mapOf("key" to key))
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    companion object {
        const val TTS_PROVIDER_SYSTEM = "system"
        const val TTS_PROVIDER_ELEVENLABS = "elevenlabs"
        const val VOICE_MODE_FULL = "full"
        const val VOICE_MODE_COMPACT = "compact"
        const val VOICE_MODE_MINIMAL = "minimal"
        const val SPEECH_RATE_MIN = 0.5f
        const val SPEECH_RATE_MAX = 2.0f
        const val SPEECH_RATE_DEFAULT = 1.0f
        const val SENSITIVITY_MIN = 0.0f
        const val SENSITIVITY_MAX = 1.0f
        const val WAKE_WORD_SENSITIVITY_DEFAULT = 0.5f
        const val LANGUAGE_DEFAULT = "en"
    }
}

data class VoiceSettingsData(
    val ttsProvider: String,
    val selectedVoiceId: String,
    val speechRate: Float,
    val voiceMode: String,
    val isWakeWordEnabled: Boolean,
    val wakeWordSensitivity: Float,
    val selectedLanguage: String,
)

sealed interface VoiceUiState {
    data object Loading : VoiceUiState

    data class Success(
        val settings: VoiceSettingsData,
        val availableVoices: List<TTSVoiceInfo>,
        val isSaving: Boolean,
    ) : VoiceUiState

    data class Error(val message: String) : VoiceUiState
}
