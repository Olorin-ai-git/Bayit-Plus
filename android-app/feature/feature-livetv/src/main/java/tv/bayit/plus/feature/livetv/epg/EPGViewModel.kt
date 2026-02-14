package tv.bayit.plus.feature.livetv.epg

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.EPGRepository
import javax.inject.Inject

@HiltViewModel
class EPGViewModel @Inject constructor(
    private val epgRepository: EPGRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<EPGUiState>(EPGUiState.Loading)
    val uiState: StateFlow<EPGUiState> = _uiState.asStateFlow()

    private val _selectedChannelId = MutableStateFlow<String?>(null)
    val selectedChannelId: StateFlow<String?> = _selectedChannelId.asStateFlow()

    init {
        loadEPG()
    }

    fun selectChannel(channelId: String) {
        _selectedChannelId.value = channelId
        logger.debug("EPG channel selected", mapOf("channelId" to channelId))
    }

    fun refresh() {
        val current = _uiState.value
        if (current is EPGUiState.Success) {
            _uiState.value = current.copy(isRefreshing = true)
        }
        loadEPG()
    }

    fun retry() {
        _uiState.value = EPGUiState.Loading
        loadEPG()
    }

    private fun loadEPG() {
        viewModelScope.launch {
            logger.debug("Loading EPG data")
            when (val result = epgRepository.getEPGSchedule()) {
                is BayitResult.Success -> {
                    val epgData = result.data
                    logger.info("EPG data loaded", mapOf("channelCount" to epgData.size.toString()))
                    _uiState.value = EPGUiState.Success(
                        epgData = epgData,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("EPG load failed", result.exception)
                    _uiState.value = EPGUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface EPGUiState {
    data object Loading : EPGUiState

    data class Success(
        val epgData: List<Any>,
        val isRefreshing: Boolean,
    ) : EPGUiState

    data class Error(val message: String) : EPGUiState
}
