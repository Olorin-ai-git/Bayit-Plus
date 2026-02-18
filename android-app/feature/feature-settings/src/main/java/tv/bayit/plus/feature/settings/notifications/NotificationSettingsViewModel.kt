package tv.bayit.plus.feature.settings.notifications

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
import tv.bayit.plus.core.model.NotificationSettings
import javax.inject.Inject

@HiltViewModel
class NotificationSettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<NotificationUiState>(NotificationUiState.Loading)
    val uiState: StateFlow<NotificationUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            logger.debug("Loading notification settings")
            when (val result = settingsRepository.getNotificationSettings()) {
                is BayitResult.Success -> {
                    _uiState.value = NotificationUiState.Success(
                        settings = result.data,
                        isSaving = false,
                    )
                    logger.info("Notification settings loaded")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load notification settings", result.exception)
                    _uiState.value = NotificationUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updateSettings(updated: NotificationSettings) {
        val current = _uiState.value as? NotificationUiState.Success ?: return
        _uiState.value = current.copy(settings = updated, isSaving = true)

        viewModelScope.launch {
            logger.debug("Updating notification settings")
            when (val result = settingsRepository.updateNotificationSettings(updated)) {
                is BayitResult.Success -> {
                    _uiState.value = current.copy(settings = updated, isSaving = false)
                    logger.info("Notification settings updated")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to update notification settings", result.exception)
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = NotificationUiState.Loading
        loadSettings()
    }
}

sealed interface NotificationUiState {
    data object Loading : NotificationUiState

    data class Success(
        val settings: NotificationSettings,
        val isSaving: Boolean,
    ) : NotificationUiState

    data class Error(val message: String) : NotificationUiState
}
