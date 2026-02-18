package tv.bayit.plus.feature.vod

import androidx.annotation.StringRes
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
import tv.bayit.plus.feature.vod.R
import javax.inject.Inject

enum class VodFilter(@StringRes val labelResId: Int) {
    ALL(R.string.vod_filter_all),
    COLLECTIONS(R.string.vod_filter_collections),
    MOVIES(R.string.vod_filter_movies),
    SERIES(R.string.vod_filter_series),
    ISRAELI_MOVIES(R.string.vod_filter_israeli_movies),
    ISRAELI_SERIES(R.string.vod_filter_israeli_series),
    MUSIC(R.string.vod_filter_music),
    DOCUMENTARY(R.string.vod_filter_documentary),
}

@HiltViewModel
class VodViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val categoryRepository: CategoryRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<VodUiState>(VodUiState.Loading)
    val uiState: StateFlow<VodUiState> = _uiState.asStateFlow()

    private val _allItems = MutableStateFlow<List<ContentItem>>(emptyList())
    private val _collections = MutableStateFlow<List<CollectionDetail>>(emptyList())
    private val _sectionCategoryIds = MutableStateFlow<Map<String, String>>(emptyMap())

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

    fun selectFilter(filter: VodFilter) {
        val currentState = _uiState.value as? VodUiState.Success ?: return

        if (filter == VodFilter.COLLECTIONS) {
            _uiState.value = currentState.copy(
                selectedFilter = filter,
                contentItems = collectionsAsContentItems(),
            )
            return
        }

        val categoryId = resolveSectionCategoryId(filter)
        if (categoryId != null) {
            _uiState.value = currentState.copy(
                selectedFilter = filter,
                isLoadingContent = true,
            )
            loadSectionContent(filter, categoryId)
        } else {
            _uiState.value = currentState.copy(
                selectedFilter = filter,
                contentItems = applyLocalFilter(_allItems.value, filter),
            )
        }
    }

    private fun loadAllContent() {
        viewModelScope.launch {
            if (_uiState.value !is VodUiState.Success) {
                _uiState.value = VodUiState.Loading
            }

            logger.debug("Loading all VOD content")

            val allItems = mutableListOf<ContentItem>()
            var page = 1

            while (true) {
                when (val result = contentRepository.getAllContent(page, PAGE_SIZE)) {
                    is BayitResult.Success -> {
                        @Suppress("UNCHECKED_CAST")
                        val items = (result.data as List<Any>).filterIsInstance<ContentItem>()
                        allItems.addAll(items)
                        if (items.size < PAGE_SIZE) break
                        page++
                    }
                    is BayitResult.Error -> {
                        if (allItems.isEmpty()) {
                            logger.error(
                                "VOD content load failed",
                                result.exception,
                                mapOf("errorMessage" to result.message.orEmpty()),
                            )
                            _uiState.value = VodUiState.Error(
                                message = result.message ?: result.exception.message.orEmpty(),
                            )
                            return@launch
                        }
                        break
                    }
                    is BayitResult.Loading -> Unit
                }
            }

            logger.info(
                "VOD content loaded",
                mapOf("itemCount" to allItems.size.toString()),
            )

            _allItems.value = allItems

            val currentFilter = (_uiState.value as? VodUiState.Success)?.selectedFilter
                ?: VodFilter.ALL
            _uiState.value = VodUiState.Success(
                selectedFilter = currentFilter,
                contentItems = applyLocalFilter(allItems, currentFilter),
                isRefreshing = false,
                isLoadingContent = false,
            )
        }
    }

    private fun loadCategories() {
        viewModelScope.launch {
            when (val result = categoryRepository.getCategories()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val categories = (result.data as List<Any>).filterIsInstance<ContentCategory>()
                    val nameToId = mutableMapOf<String, String>()
                    for (cat in categories) {
                        nameToId[cat.name.lowercase()] = cat.id
                    }
                    _sectionCategoryIds.value = nameToId
                }
                is BayitResult.Error -> {
                    logger.debug(
                        "VOD categories unavailable",
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadSectionContent(filter: VodFilter, categoryId: String) {
        viewModelScope.launch {
            when (val result = categoryRepository.getContentForCategory(categoryId, 1)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<ContentItem>()
                    val currentState = _uiState.value as? VodUiState.Success ?: return@launch
                    if (currentState.selectedFilter == filter) {
                        _uiState.value = currentState.copy(
                            contentItems = items,
                            isLoadingContent = false,
                        )
                    }
                }
                is BayitResult.Error -> {
                    logger.debug(
                        "Section content load failed",
                        mapOf("categoryId" to categoryId),
                    )
                    val currentState = _uiState.value as? VodUiState.Success ?: return@launch
                    if (currentState.selectedFilter == filter) {
                        _uiState.value = currentState.copy(
                            contentItems = emptyList(),
                            isLoadingContent = false,
                        )
                    }
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadCollectionRecommendations() {
        viewModelScope.launch {
            when (val result = contentRepository.getCollectionRecommendations()) {
                is BayitResult.Success -> {
                    _collections.value = result.data
                    val currentState = _uiState.value as? VodUiState.Success ?: return@launch
                    _uiState.value = currentState.copy(featuredCollections = result.data)
                }
                is BayitResult.Error -> {
                    logger.debug(
                        "Collection recommendations unavailable",
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun collectionsAsContentItems(): List<ContentItem> =
        _collections.value.map { collection ->
            ContentItem(
                id = collection.id,
                title = collection.title,
                description = collection.description,
                thumbnail = collection.thumbnail,
                backdrop = collection.backdrop,
                type = "collection",
                isCollectionParent = true,
                availableMovies = collection.availableMovies,
                totalMovies = collection.totalMovies,
            )
        }

    private fun resolveSectionCategoryId(filter: VodFilter): String? {
        val catMap = _sectionCategoryIds.value
        return when (filter) {
            VodFilter.MUSIC -> catMap.firstMatchingKey("מוזיקה", "music")
            VodFilter.DOCUMENTARY -> catMap.firstMatchingKey("תיעודי", "doc")
            else -> null
        }
    }

    internal companion object {
        private const val PAGE_SIZE = 200

        fun applyLocalFilter(items: List<ContentItem>, filter: VodFilter): List<ContentItem> {
            return when (filter) {
                VodFilter.ALL -> items
                VodFilter.MOVIES -> items.filter { it.type == "movie" }
                VodFilter.SERIES -> items.filter { it.type == "series" || it.isSeries == true }
                VodFilter.ISRAELI_MOVIES -> items.filter {
                    it.matchesCategoryTag("israeli") && it.type == "movie"
                }
                VodFilter.ISRAELI_SERIES -> items.filter {
                    it.matchesCategoryTag("israeli") &&
                        (it.type == "series" || it.isSeries == true)
                }
                VodFilter.COLLECTIONS,
                VodFilter.MUSIC,
                VodFilter.DOCUMENTARY,
                -> items
            }
        }

        private fun ContentItem.matchesCategoryTag(tag: String): Boolean =
            categorySlug?.contains(tag, ignoreCase = true) == true ||
                category?.contains(tag, ignoreCase = true) == true

        private fun Map<String, String>.firstMatchingKey(vararg tags: String): String? =
            entries.firstOrNull { entry -> tags.any { entry.key.contains(it) } }?.value
    }
}

sealed interface VodUiState {
    data object Loading : VodUiState

    data class Success(
        val selectedFilter: VodFilter = VodFilter.ALL,
        val contentItems: List<ContentItem>,
        val featuredCollections: List<CollectionDetail> = emptyList(),
        val isRefreshing: Boolean = false,
        val isLoadingContent: Boolean = false,
    ) : VodUiState

    data class Error(
        val message: String,
    ) : VodUiState
}
