package tv.bayit.plus.feature.livetv

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.LiveTVRepository
import tv.bayit.plus.core.model.LiveChannelItem
import javax.inject.Inject

@HiltViewModel
class LiveTVViewModel @Inject constructor(
    private val liveTVRepository: LiveTVRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<LiveTVUiState>(LiveTVUiState.Loading)
    val uiState: StateFlow<LiveTVUiState> = _uiState.asStateFlow()

    init {
        loadChannels()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is LiveTVUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadChannels()
    }

    fun selectCategory(category: String?) {
        val currentState = _uiState.value
        if (currentState is LiveTVUiState.Success) {
            _uiState.value = currentState.copy(selectedCategory = category)
        }
    }

    private fun loadChannels() {
        viewModelScope.launch {
            logger.debug("Loading live TV channels")

            when (val result = liveTVRepository.getChannels()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val channels = (result.data as List<Any>).filterIsInstance<LiveChannelItem>()
                    val categories = channels.mapNotNull { it.category }.distinct().sorted()

                    logger.info(
                        "Live TV channels loaded",
                        mapOf(
                            "channelCount" to channels.size.toString(),
                            "categoryCount" to categories.size.toString(),
                        ),
                    )

                    _uiState.value = LiveTVUiState.Success(
                        channels = channels,
                        categories = categories,
                        selectedCategory = null,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Live TV channels load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = LiveTVUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface LiveTVUiState {
    data object Loading : LiveTVUiState

    data class Success(
        val channels: List<LiveChannelItem>,
        val categories: List<String>,
        val selectedCategory: String?,
        val isRefreshing: Boolean = false,
    ) : LiveTVUiState {
        val filteredChannels: List<LiveChannelItem>
            get() = if (selectedCategory == null) {
                channels
            } else {
                channels.filter { it.category == selectedCategory }
            }
    }

    data class Error(
        val message: String,
    ) : LiveTVUiState
}
