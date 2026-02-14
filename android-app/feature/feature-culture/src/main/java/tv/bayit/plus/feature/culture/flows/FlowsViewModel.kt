package tv.bayit.plus.feature.culture.flows

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.model.ContentItem
import javax.inject.Inject

private const val FLOWS_CATEGORY_ID = "flows"

@HiltViewModel
class FlowsViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<FlowsUiState>(FlowsUiState.Loading)
    val uiState: StateFlow<FlowsUiState> = _uiState.asStateFlow()

    init {
        loadContent()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is FlowsUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadContent()
    }

    private fun loadContent() {
        viewModelScope.launch {
            logger.debug("Loading flows content")

            when (val result = contentRepository.getByCategory(FLOWS_CATEGORY_ID)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<ContentItem>()

                    logger.info(
                        "Flows content loaded",
                        mapOf("itemCount" to items.size.toString()),
                    )

                    _uiState.value = FlowsUiState.Success(
                        items = items,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Flows content load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = FlowsUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface FlowsUiState {
    data object Loading : FlowsUiState

    data class Success(
        val items: List<ContentItem>,
        val isRefreshing: Boolean = false,
    ) : FlowsUiState

    data class Error(
        val message: String,
    ) : FlowsUiState
}
