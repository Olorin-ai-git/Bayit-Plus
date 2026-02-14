package tv.bayit.plus.feature.settings.language

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SettingsRepository
import javax.inject.Inject

@HiltViewModel
class LanguageSettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<LanguageUiState>(LanguageUiState.Loading)
    val uiState: StateFlow<LanguageUiState> = _uiState.asStateFlow()

    init {
        loadCurrentLanguage()
    }

    private fun loadCurrentLanguage() {
        viewModelScope.launch {
            logger.debug("Loading current language setting")
            when (val result = settingsRepository.getLanguage()) {
                is BayitResult.Success -> {
                    _uiState.value = LanguageUiState.Success(
                        selectedCode = result.data,
                        isSaving = false,
                    )
                    logger.info("Language loaded", mapOf("code" to result.data))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load language", result.exception)
                    _uiState.value = LanguageUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun selectLanguage(code: String) {
        val current = _uiState.value as? LanguageUiState.Success ?: return
        if (current.selectedCode == code) return

        _uiState.value = current.copy(selectedCode = code, isSaving = true)

        viewModelScope.launch {
            logger.debug("Setting language", mapOf("code" to code))
            when (val result = settingsRepository.setLanguage(code)) {
                is BayitResult.Success -> {
                    _uiState.value = current.copy(selectedCode = code, isSaving = false)
                    logger.info("Language updated", mapOf("code" to code))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to set language", result.exception, mapOf("code" to code))
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = LanguageUiState.Loading
        loadCurrentLanguage()
    }
}

sealed interface LanguageUiState {
    data object Loading : LanguageUiState

    data class Success(
        val selectedCode: String,
        val isSaving: Boolean,
    ) : LanguageUiState

    data class Error(val message: String) : LanguageUiState
}

/**
 * Supported language options. Each entry maps a BCP-47 code to its
 * native display name. The list matches the 10 languages supported
 * by the Bayit+ localization system.
 */
data class LanguageOption(val code: String, val nativeName: String)

fun supportedLanguages(): List<LanguageOption> = listOf(
    LanguageOption(code = "en", nativeName = "English"),
    LanguageOption(code = "he", nativeName = "\u05E2\u05D1\u05E8\u05D9\u05EA"),
    LanguageOption(code = "es", nativeName = "Espa\u00F1ol"),
    LanguageOption(code = "fr", nativeName = "Fran\u00E7ais"),
    LanguageOption(code = "it", nativeName = "Italiano"),
    LanguageOption(code = "ja", nativeName = "\u65E5\u672C\u8A9E"),
    LanguageOption(code = "zh", nativeName = "\u4E2D\u6587"),
    LanguageOption(code = "hi", nativeName = "\u0939\u093F\u0928\u094D\u0926\u0940"),
    LanguageOption(code = "bn", nativeName = "\u09AC\u09BE\u0982\u09B2\u09BE"),
    LanguageOption(code = "ta", nativeName = "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD"),
)
