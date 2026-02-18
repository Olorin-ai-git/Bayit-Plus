package tv.bayit.plus.feature.settings.subtitles

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
import tv.bayit.plus.core.model.SubtitleSettings
import javax.inject.Inject

@HiltViewModel
class SubtitleSettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SubtitleUiState>(SubtitleUiState.Loading)
    val uiState: StateFlow<SubtitleUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            logger.debug("Loading subtitle settings")
            when (val result = settingsRepository.getSubtitleSettings()) {
                is BayitResult.Success -> {
                    _uiState.value = SubtitleUiState.Success(
                        settings = result.data,
                        isSaving = false,
                    )
                    logger.info("Subtitle settings loaded")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load subtitle settings", result.exception)
                    _uiState.value = SubtitleUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updateSettings(updated: SubtitleSettings) {
        val current = _uiState.value as? SubtitleUiState.Success ?: return
        _uiState.value = current.copy(settings = updated, isSaving = true)

        viewModelScope.launch {
            logger.debug("Updating subtitle settings")
            when (val result = settingsRepository.updateSubtitleSettings(updated)) {
                is BayitResult.Success -> {
                    _uiState.value = current.copy(settings = updated, isSaving = false)
                    logger.info("Subtitle settings updated")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to update subtitle settings", result.exception)
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = SubtitleUiState.Loading
        loadSettings()
    }
}

sealed interface SubtitleUiState {
    data object Loading : SubtitleUiState

    data class Success(
        val settings: SubtitleSettings,
        val isSaving: Boolean,
    ) : SubtitleUiState

    data class Error(val message: String) : SubtitleUiState
}
