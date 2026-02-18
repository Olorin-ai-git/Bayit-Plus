package tv.bayit.plus.feature.settings.playback

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
import tv.bayit.plus.core.model.PlaybackSettings
import javax.inject.Inject

@HiltViewModel
class PlaybackSettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PlaybackUiState>(PlaybackUiState.Loading)
    val uiState: StateFlow<PlaybackUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            logger.debug("Loading playback settings")
            when (val result = settingsRepository.getPlaybackSettings()) {
                is BayitResult.Success -> {
                    _uiState.value = PlaybackUiState.Success(
                        settings = result.data,
                        isSaving = false,
                    )
                    logger.info("Playback settings loaded")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load playback settings", result.exception)
                    _uiState.value = PlaybackUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updateSettings(updated: PlaybackSettings) {
        val current = _uiState.value as? PlaybackUiState.Success ?: return
        _uiState.value = current.copy(settings = updated, isSaving = true)

        viewModelScope.launch {
            logger.debug("Updating playback settings")
            when (val result = settingsRepository.updatePlaybackSettings(updated)) {
                is BayitResult.Success -> {
                    _uiState.value = current.copy(settings = updated, isSaving = false)
                    logger.info("Playback settings updated")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to update playback settings", result.exception)
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = PlaybackUiState.Loading
        loadSettings()
    }
}

sealed interface PlaybackUiState {
    data object Loading : PlaybackUiState

    data class Success(
        val settings: PlaybackSettings,
        val isSaving: Boolean,
    ) : PlaybackUiState

    data class Error(val message: String) : PlaybackUiState
}
