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
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.ContentCategory
import tv.bayit.plus.core.model.ContentItem
import javax.inject.Inject

@HiltViewModel
class VodViewModel @Inject constructor(
    private val categoryRepository: CategoryRepository,
    private val contentRepository: ContentRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<VodUiState>(VodUiState.Loading)
    val uiState: StateFlow<VodUiState> = _uiState.asStateFlow()

    private val _allItems = MutableStateFlow<List<ContentItem>>(emptyList())

    init {
        loadAllContent()
        loadCategories()
        loadCollectionRecommendations()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is VodUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadAllContent()
        loadCategories()
        loadCollectionRecommendations()
    }

    fun selectCategory(categoryId: String) {
        val currentState = _uiState.value as? VodUiState.Success ?: return
        _uiState.value = currentState.copy(
            selectedCategoryId = categoryId,
            contentItems = filterByCategory(_allItems.value, categoryId, currentState.categories),
        )
    }

    private fun loadAllContent() {
        viewModelScope.launch {
            if (_uiState.value !is VodUiState.Success) {
                _uiState.value = VodUiState.Loading
            }

            logger.debug("Loading all VOD content")

            when (val result = contentRepository.getAllContent(1, 100)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<ContentItem>()

                    logger.info(
                        "VOD content loaded",
                        mapOf("itemCount" to items.size.toString()),
                    )

                    _allItems.value = items

                    val currentState = _uiState.value
                    val categories = (currentState as? VodUiState.Success)?.categories ?: emptyList()
                    val selectedId = (currentState as? VodUiState.Success)?.selectedCategoryId
                    _uiState.value = VodUiState.Success(
                        categories = categories,
                        selectedCategoryId = selectedId,
                        contentItems = filterByCategory(items, selectedId, categories),
                        isRefreshing = false,
                        isLoadingContent = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "VOD content load failed",
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

                    val currentState = _uiState.value as? VodUiState.Success ?: return@launch
                    _uiState.value = currentState.copy(
                        categories = categories,
                        contentItems = filterByCategory(
                            _allItems.value,
                            currentState.selectedCategoryId,
                            categories,
                        ),
                    )
                }
                is BayitResult.Error -> {
                    logger.debug(
                        "VOD categories unavailable, proceeding without filter chips",
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadCollectionRecommendations() {
        viewModelScope.launch {
            when (val result = contentRepository.getCollectionRecommendations()) {
                is BayitResult.Success -> {
                    val currentState = _uiState.value as? VodUiState.Success ?: return@launch
                    _uiState.value = currentState.copy(featuredCollections = result.data)
                }
                is BayitResult.Error -> {
                    logger.debug(
                        "Collection recommendations unavailable, hiding banner",
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun filterByCategory(
        items: List<ContentItem>,
        categoryId: String?,
        categories: List<ContentCategory>,
    ): List<ContentItem> {
        if (categoryId == null) return items
        val categoryName = categories.firstOrNull { it.id == categoryId }?.name ?: return items
        return items.filter { it.category == categoryName }
    }
}

sealed interface VodUiState {
    data object Loading : VodUiState

    data class Success(
        val categories: List<ContentCategory>,
        val selectedCategoryId: String?,
        val contentItems: List<ContentItem>,
        val featuredCollections: List<CollectionDetail> = emptyList(),
        val isRefreshing: Boolean = false,
        val isLoadingContent: Boolean = false,
    ) : VodUiState

    data class Error(
        val message: String,
    ) : VodUiState
}
