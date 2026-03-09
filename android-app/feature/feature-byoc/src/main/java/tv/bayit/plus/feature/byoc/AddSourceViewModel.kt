package tv.bayit.plus.feature.byoc

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject

sealed class AddSourceUiState {
    data object Idle : AddSourceUiState()
    data object Validating : AddSourceUiState()
    data object Success : AddSourceUiState()
    data class Error(val message: String) : AddSourceUiState()
}

enum class SourceInputType { M3U, XTREAM }

@HiltViewModel
class AddSourceViewModel @Inject constructor(
    private val sourceManager: BYOCSourceManager,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AddSourceUiState>(AddSourceUiState.Idle)
    val uiState: StateFlow<AddSourceUiState> = _uiState.asStateFlow()

    fun addM3USource(name: String, url: String) {
        if (name.isBlank() || url.isBlank()) {
            _uiState.value = AddSourceUiState.Error("Name and URL are required")
            return
        }
        viewModelScope.launch {
            _uiState.value = AddSourceUiState.Validating
            try {
                sourceManager.addIPTVSource(name, url)
                sourceManager.refreshSource(sourceManager.sources.value.last().id)
                _uiState.value = AddSourceUiState.Success
            } catch (e: Exception) {
                logger.error("Failed to add M3U source", error = e)
                _uiState.value = AddSourceUiState.Error(e.message ?: "Failed to add source")
            }
        }
    }

    fun addXtreamSource(name: String, server: String, username: String, password: String) {
        if (name.isBlank() || server.isBlank() || username.isBlank() || password.isBlank()) {
            _uiState.value = AddSourceUiState.Error("All fields are required")
            return
        }
        viewModelScope.launch {
            _uiState.value = AddSourceUiState.Validating
            try {
                sourceManager.addXtreamSource(name, server, username, password)
                sourceManager.refreshSource(sourceManager.sources.value.last().id)
                _uiState.value = AddSourceUiState.Success
            } catch (e: Exception) {
                logger.error("Failed to add Xtream source", error = e)
                _uiState.value = AddSourceUiState.Error(e.message ?: "Failed to add source")
            }
        }
    }

    fun resetState() {
        _uiState.value = AddSourceUiState.Idle
    }
}
