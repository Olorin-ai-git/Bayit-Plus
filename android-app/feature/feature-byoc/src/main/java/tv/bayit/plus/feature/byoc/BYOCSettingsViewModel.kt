package tv.bayit.plus.feature.byoc

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.byoc.models.BYOCSourceConfig
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject

sealed class BYOCSettingsUiState {
    data object Loading : BYOCSettingsUiState()
    data class Ready(val sources: List<BYOCSourceConfig>) : BYOCSettingsUiState()
}

@HiltViewModel
class BYOCSettingsViewModel @Inject constructor(
    private val sourceManager: BYOCSourceManager,
    private val logger: BayitLogger,
) : ViewModel() {

    val uiState: StateFlow<BYOCSettingsUiState> = sourceManager.sources
        .map { sources -> BYOCSettingsUiState.Ready(sources) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS),
            initialValue = BYOCSettingsUiState.Loading,
        )

    fun removeSource(sourceId: String) {
        viewModelScope.launch {
            try {
                sourceManager.removeSource(sourceId)
            } catch (e: Exception) {
                logger.error("Failed to remove BYOC source", error = e, metadata = mapOf("sourceId" to sourceId))
            }
        }
    }

    fun refreshAll() {
        viewModelScope.launch {
            try {
                sourceManager.refreshAll()
            } catch (e: Exception) {
                logger.error("Failed to refresh BYOC sources", error = e)
            }
        }
    }

    companion object {
        private const val STOP_TIMEOUT_MS = 5000L
    }
}
