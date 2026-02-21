package tv.bayit.plus.feature.vod

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ContentCategory
import tv.bayit.plus.core.model.ContentItem

internal fun VodViewModel.loadAllContent() {
    viewModelScope.launch {
        if (uiState.value !is VodUiState.Success) {
            updateUiState(VodUiState.Loading)
        }

        logger.debug("Loading all VOD content")

        val loadedItems = mutableListOf<ContentItem>()
        var page = 1

        while (true) {
            when (val result = contentRepository.getAllContent(page, VodViewModel.PAGE_SIZE)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<ContentItem>()
                    loadedItems.addAll(items)
                    if (items.size < VodViewModel.PAGE_SIZE) break
                    page++
                }
                is BayitResult.Error -> {
                    if (loadedItems.isEmpty()) {
                        logger.error(
                            "VOD content load failed",
                            result.exception,
                            mapOf("errorMessage" to result.message.orEmpty()),
                        )
                        updateUiState(VodUiState.Error(
                            message = result.message ?: result.exception.message.orEmpty(),
                        ))
                        return@launch
                    }
                    break
                }
                is BayitResult.Loading -> Unit
            }
        }

        logger.info(
            "VOD content loaded",
            mapOf("itemCount" to loadedItems.size.toString()),
        )

        allItems.value = loadedItems

        val currentFilter = (uiState.value as? VodUiState.Success)?.selectedFilter
            ?: VodFilter.ALL
        updateUiState(VodUiState.Success(
            selectedFilter = currentFilter,
            contentItems = applyLocalFilter(loadedItems, currentFilter),
            isRefreshing = false,
            isLoadingContent = false,
        ))
    }
}

internal fun VodViewModel.loadCategories() {
    viewModelScope.launch {
        when (val result = categoryRepository.getCategories()) {
            is BayitResult.Success -> {
                @Suppress("UNCHECKED_CAST")
                val categories = (result.data as List<Any>).filterIsInstance<ContentCategory>()
                val nameToId = mutableMapOf<String, String>()
                for (cat in categories) {
                    nameToId[cat.name.lowercase()] = cat.id
                }
                sectionCategoryIds.value = nameToId
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

internal fun VodViewModel.loadSectionContent(filter: VodFilter, categoryId: String) {
    viewModelScope.launch {
        when (val result = categoryRepository.getContentForCategory(categoryId, 1)) {
            is BayitResult.Success -> {
                @Suppress("UNCHECKED_CAST")
                val items = (result.data as List<Any>).filterIsInstance<ContentItem>()
                val currentState = uiState.value as? VodUiState.Success ?: return@launch
                if (currentState.selectedFilter == filter) {
                    updateUiState(currentState.copy(
                        contentItems = items,
                        isLoadingContent = false,
                    ))
                }
            }
            is BayitResult.Error -> {
                logger.debug(
                    "Section content load failed",
                    mapOf("categoryId" to categoryId),
                )
                val currentState = uiState.value as? VodUiState.Success ?: return@launch
                if (currentState.selectedFilter == filter) {
                    updateUiState(currentState.copy(
                        contentItems = emptyList(),
                        isLoadingContent = false,
                    ))
                }
            }
            is BayitResult.Loading -> Unit
        }
    }
}

internal fun VodViewModel.loadCollectionRecommendations() {
    viewModelScope.launch {
        when (val result = contentRepository.getCollectionRecommendations()) {
            is BayitResult.Success -> {
                collections.value = result.data
                val currentState = uiState.value as? VodUiState.Success ?: return@launch
                updateUiState(currentState.copy(featuredCollections = result.data))
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
