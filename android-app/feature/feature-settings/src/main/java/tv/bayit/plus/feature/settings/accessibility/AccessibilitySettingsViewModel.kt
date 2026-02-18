package tv.bayit.plus.feature.settings.accessibility

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
import tv.bayit.plus.core.model.AccessibilitySettings
import javax.inject.Inject

@HiltViewModel
class AccessibilitySettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AccessibilityUiState>(AccessibilityUiState.Loading)
    val uiState: StateFlow<AccessibilityUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            logger.debug("Loading accessibility settings")
            when (val result = settingsRepository.getAccessibilitySettings()) {
                is BayitResult.Success -> {
                    _uiState.value = AccessibilityUiState.Success(
                        settings = result.data,
                        isSaving = false,
                    )
                    logger.info("Accessibility settings loaded")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load accessibility settings", result.exception)
                    _uiState.value = AccessibilityUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updateSettings(updated: AccessibilitySettings) {
        val current = _uiState.value as? AccessibilityUiState.Success ?: return
        _uiState.value = current.copy(settings = updated, isSaving = true)

        viewModelScope.launch {
            logger.debug("Updating accessibility settings")
            when (val result = settingsRepository.updateAccessibilitySettings(updated)) {
                is BayitResult.Success -> {
                    _uiState.value = current.copy(settings = updated, isSaving = false)
                    logger.info("Accessibility settings updated")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to update accessibility settings", result.exception)
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = AccessibilityUiState.Loading
        loadSettings()
    }
}

sealed interface AccessibilityUiState {
    data object Loading : AccessibilityUiState

    data class Success(
        val settings: AccessibilitySettings,
        val isSaving: Boolean,
    ) : AccessibilityUiState

    data class Error(val message: String) : AccessibilityUiState
}
