package tv.bayit.plus.feature.kids.youngsters

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

private const val YOUNGSTERS_CATEGORY_ID = "youngsters"

@HiltViewModel
class YoungstersViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<YoungstersUiState>(YoungstersUiState.Loading)
    val uiState: StateFlow<YoungstersUiState> = _uiState.asStateFlow()

    init {
        loadContent()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is YoungstersUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadContent()
    }

    private fun loadContent() {
        viewModelScope.launch {
            logger.debug("Loading youngsters content")

            when (val result = contentRepository.getByCategory(YOUNGSTERS_CATEGORY_ID)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<ContentItem>()

                    logger.info(
                        "Youngsters content loaded",
                        mapOf("itemCount" to items.size.toString()),
                    )

                    _uiState.value = YoungstersUiState.Success(
                        items = items,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Youngsters content load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = YoungstersUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface YoungstersUiState {
    data object Loading : YoungstersUiState

    data class Success(
        val items: List<ContentItem>,
        val isRefreshing: Boolean = false,
    ) : YoungstersUiState

    data class Error(
        val message: String,
    ) : YoungstersUiState
}
