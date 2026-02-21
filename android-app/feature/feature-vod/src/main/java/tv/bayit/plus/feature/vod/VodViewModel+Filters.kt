package tv.bayit.plus.feature.vod

import tv.bayit.plus.core.model.ContentItem

fun VodViewModel.selectFilter(filter: VodFilter) {
    val currentState = uiState.value as? VodUiState.Success ?: return

    if (filter == VodFilter.COLLECTIONS) {
        updateUiState(currentState.copy(
            selectedFilter = filter,
            contentItems = collectionsAsContentItems(),
        ))
        return
    }

    val categoryId = resolveSectionCategoryId(filter)
    if (categoryId != null) {
        updateUiState(currentState.copy(
            selectedFilter = filter,
            isLoadingContent = true,
        ))
        loadSectionContent(filter, categoryId)
    } else {
        updateUiState(currentState.copy(
            selectedFilter = filter,
            contentItems = applyLocalFilter(allItems.value, filter),
        ))
    }
}

internal fun VodViewModel.collectionsAsContentItems(): List<ContentItem> =
    collections.value.map { collection ->
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

internal fun VodViewModel.resolveSectionCategoryId(filter: VodFilter): String? {
    val catMap = sectionCategoryIds.value
    return when (filter) {
        VodFilter.MUSIC -> catMap.firstMatchingKey("מוזיקה", "music")
        VodFilter.DOCUMENTARY -> catMap.firstMatchingKey("תיעודי", "doc")
        else -> null
    }
}

private fun Map<String, String>.firstMatchingKey(vararg tags: String): String? =
    entries.firstOrNull { entry -> tags.any { entry.key.contains(it) } }?.value

internal fun applyLocalFilter(items: List<ContentItem>, filter: VodFilter): List<ContentItem> {
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
