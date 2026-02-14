package tv.bayit.plus.feature.kids.children

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

private const val KIDS_CATEGORY_ID = "kids"

@HiltViewModel
class ChildrenViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ChildrenUiState>(ChildrenUiState.Loading)
    val uiState: StateFlow<ChildrenUiState> = _uiState.asStateFlow()

    init {
        loadContent()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is ChildrenUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadContent()
    }

    private fun loadContent() {
        viewModelScope.launch {
            logger.debug("Loading children content")

            when (val result = contentRepository.getByCategory(KIDS_CATEGORY_ID)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<ContentItem>()

                    logger.info(
                        "Children content loaded",
                        mapOf("itemCount" to items.size.toString()),
                    )

                    _uiState.value = ChildrenUiState.Success(
                        items = items,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Children content load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = ChildrenUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface ChildrenUiState {
    data object Loading : ChildrenUiState

    data class Success(
        val items: List<ContentItem>,
        val isRefreshing: Boolean = false,
    ) : ChildrenUiState

    data class Error(
        val message: String,
    ) : ChildrenUiState
}
