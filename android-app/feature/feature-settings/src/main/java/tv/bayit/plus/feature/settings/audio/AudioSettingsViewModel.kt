package tv.bayit.plus.feature.settings.audio

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
import tv.bayit.plus.core.model.AudioSettings
import javax.inject.Inject

@HiltViewModel
class AudioSettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AudioUiState>(AudioUiState.Loading)
    val uiState: StateFlow<AudioUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            logger.debug("Loading audio settings")
            when (val result = settingsRepository.getAudioSettings()) {
                is BayitResult.Success -> {
                    _uiState.value = AudioUiState.Success(
                        settings = result.data,
                        isSaving = false,
                    )
                    logger.info("Audio settings loaded")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load audio settings", result.exception)
                    _uiState.value = AudioUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updateSettings(updated: AudioSettings) {
        val current = _uiState.value as? AudioUiState.Success ?: return
        _uiState.value = current.copy(settings = updated, isSaving = true)

        viewModelScope.launch {
            logger.debug("Updating audio settings")
            when (val result = settingsRepository.updateAudioSettings(updated)) {
                is BayitResult.Success -> {
                    _uiState.value = current.copy(settings = updated, isSaving = false)
                    logger.info("Audio settings updated")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to update audio settings", result.exception)
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = AudioUiState.Loading
        loadSettings()
    }
}

sealed interface AudioUiState {
    data object Loading : AudioUiState

    data class Success(
        val settings: AudioSettings,
        val isSaving: Boolean,
    ) : AudioUiState

    data class Error(val message: String) : AudioUiState
}
