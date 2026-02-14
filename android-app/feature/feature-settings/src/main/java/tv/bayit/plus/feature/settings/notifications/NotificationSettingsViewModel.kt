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
import tv.bayit.plus.core.model.AppSettings
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
            when (val result = settingsRepository.getSettings()) {
                is BayitResult.Success -> {
                    val settings = result.data as? AppSettings
                    val notif = settings?.notifications ?: NotificationSettings()
                    _uiState.value = NotificationUiState.Success(
                        liveAlerts = notif.liveAlerts,
                        downloadComplete = notif.downloadComplete,
                        socialUpdates = notif.socialUpdates,
                        contentRecommendations = notif.contentRecommendations,
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

    fun toggleLiveAlerts(enabled: Boolean) = updateSetting("notifications.live_alerts", enabled)
    fun toggleDownloadComplete(enabled: Boolean) = updateSetting("notifications.download_complete", enabled)
    fun toggleSocialUpdates(enabled: Boolean) = updateSetting("notifications.social_updates", enabled)
    fun toggleContentRecommendations(enabled: Boolean) = updateSetting("notifications.content_recommendations", enabled)

    private fun updateSetting(key: String, value: Boolean) {
        val current = _uiState.value as? NotificationUiState.Success ?: return
        val updated = when (key) {
            "notifications.live_alerts" -> current.copy(liveAlerts = value)
            "notifications.download_complete" -> current.copy(downloadComplete = value)
            "notifications.social_updates" -> current.copy(socialUpdates = value)
            "notifications.content_recommendations" -> current.copy(contentRecommendations = value)
            else -> current
        }.copy(isSaving = true)
        _uiState.value = updated

        viewModelScope.launch {
            logger.debug("Updating notification setting", mapOf("key" to key, "value" to value.toString()))
            when (val result = settingsRepository.updateSetting(key, value)) {
                is BayitResult.Success -> {
                    _uiState.value = updated.copy(isSaving = false)
                    logger.info("Notification setting updated", mapOf("key" to key))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to update notification setting", result.exception, mapOf("key" to key))
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
        val liveAlerts: Boolean,
        val downloadComplete: Boolean,
        val socialUpdates: Boolean,
        val contentRecommendations: Boolean,
        val isSaving: Boolean,
    ) : NotificationUiState

    data class Error(val message: String) : NotificationUiState
}
