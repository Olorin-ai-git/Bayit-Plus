package tv.bayit.plus.feature.vod.recordings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.model.ContentItem
import javax.inject.Inject

@HiltViewModel
class RecordingsViewModel @Inject constructor(
    private val mediaRepository: MediaRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<RecordingsUiState>(RecordingsUiState.Loading)
    val uiState: StateFlow<RecordingsUiState> = _uiState.asStateFlow()

    init {
        loadRecordings()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is RecordingsUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadRecordings()
    }

    private fun loadRecordings() {
        viewModelScope.launch {
            logger.debug("Loading DVR recordings")

            when (val result = mediaRepository.getWatchHistory()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<ContentItem>()

                    logger.info(
                        "Recordings loaded",
                        mapOf("recordingCount" to items.size.toString()),
                    )

                    _uiState.value = RecordingsUiState.Success(
                        recordings = items,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Recordings load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = RecordingsUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface RecordingsUiState {
    data object Loading : RecordingsUiState

    data class Success(
        val recordings: List<ContentItem>,
        val isRefreshing: Boolean = false,
    ) : RecordingsUiState

    data class Error(
        val message: String,
    ) : RecordingsUiState
}
