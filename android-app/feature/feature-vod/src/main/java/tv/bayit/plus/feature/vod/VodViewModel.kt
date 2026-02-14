package tv.bayit.plus.feature.vod

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.CategoryRepository
import tv.bayit.plus.core.model.ContentCategory
import tv.bayit.plus.core.model.ContentItem
import javax.inject.Inject

@HiltViewModel
class VodViewModel @Inject constructor(
    private val categoryRepository: CategoryRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<VodUiState>(VodUiState.Loading)
    val uiState: StateFlow<VodUiState> = _uiState.asStateFlow()

    init {
        loadCategories()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is VodUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadCategories()
    }

    fun selectCategory(categoryId: String) {
        val currentState = _uiState.value
        if (currentState is VodUiState.Success) {
            _uiState.value = currentState.copy(selectedCategoryId = categoryId)
            loadContentForCategory(categoryId)
        }
    }

    private fun loadCategories() {
        viewModelScope.launch {
            logger.debug("Loading VOD categories")

            when (val result = categoryRepository.getCategories()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val categories = (result.data as List<Any>).filterIsInstance<ContentCategory>()

                    logger.info(
                        "VOD categories loaded",
                        mapOf("categoryCount" to categories.size.toString()),
                    )

                    val firstCategoryId = categories.firstOrNull()?.id
                    _uiState.value = VodUiState.Success(
                        categories = categories,
                        selectedCategoryId = firstCategoryId,
                        contentItems = emptyList(),
                        isRefreshing = false,
                        isLoadingContent = firstCategoryId != null,
                    )

                    if (firstCategoryId != null) {
                        loadContentForCategory(firstCategoryId)
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "VOD categories load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = VodUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadContentForCategory(categoryId: String) {
        viewModelScope.launch {
            val currentState = _uiState.value
            if (currentState is VodUiState.Success) {
                _uiState.value = currentState.copy(isLoadingContent = true)
            }

            logger.debug("Loading VOD content", mapOf("categoryId" to categoryId))

            when (val result = categoryRepository.getContentForCategory(categoryId, 1)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<ContentItem>()

                    logger.info(
                        "VOD content loaded",
                        mapOf(
                            "categoryId" to categoryId,
                            "itemCount" to items.size.toString(),
                        ),
                    )

                    val state = _uiState.value
                    if (state is VodUiState.Success) {
                        _uiState.value = state.copy(
                            contentItems = items,
                            isLoadingContent = false,
                            isRefreshing = false,
                        )
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "VOD content load failed",
                        result.exception,
                        mapOf(
                            "categoryId" to categoryId,
                            "errorMessage" to result.message.orEmpty(),
                        ),
                    )
                    val state = _uiState.value
                    if (state is VodUiState.Success) {
                        _uiState.value = state.copy(
                            contentItems = emptyList(),
                            isLoadingContent = false,
                            isRefreshing = false,
                        )
                    }
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface VodUiState {
    data object Loading : VodUiState

    data class Success(
        val categories: List<ContentCategory>,
        val selectedCategoryId: String?,
        val contentItems: List<ContentItem>,
        val isRefreshing: Boolean = false,
        val isLoadingContent: Boolean = false,
    ) : VodUiState

    data class Error(
        val message: String,
    ) : VodUiState
}
