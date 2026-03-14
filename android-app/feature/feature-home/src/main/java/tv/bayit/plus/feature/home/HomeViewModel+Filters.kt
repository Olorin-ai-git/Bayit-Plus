package tv.bayit.plus.feature.home

import tv.bayit.plus.core.model.ContentCategory
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.CultureTrendingItem
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.core.model.SpotlightItem
import tv.bayit.plus.core.model.WatchHistoryItem

private val OWNER_ONLY_CONTENT_TYPES = listOf("movie", "series", "film", "vod", "collection")

internal fun HomeViewModel.isOwnerOnlyContent(item: ContentItem): Boolean {
    val type = (item.contentType ?: item.type)?.lowercase() ?: return false
    return OWNER_ONLY_CONTENT_TYPES.any { type.contains(it) }
}

internal fun HomeViewModel.filterCategories(
    categories: List<ContentCategory>,
): List<ContentCategory> {
    val filtered = categories.filter { category ->
        val name = category.name.lowercase()
        !hiddenChannelKeywords.any { keyword -> name.contains(keyword) }
    }
    if (ownerMode) return filtered
    return filtered.map { category ->
        category.copy(items = category.items.filter { !isOwnerOnlyContent(it) })
    }.filter { it.items.isNotEmpty() }
}

internal fun HomeViewModel.filterSpotlight(
    items: List<SpotlightItem>,
): List<SpotlightItem> = items.filter { item ->
    val type = item.type?.lowercase() ?: return@filter false
    !OWNER_ONLY_CONTENT_TYPES.any { type.contains(it) }
}

internal fun HomeViewModel.filterWatchHistory(
    items: List<WatchHistoryItem>,
): List<WatchHistoryItem> {
    if (ownerMode) return items
    return items.filter { item ->
        val type = item.type?.lowercase() ?: return@filter true
        !OWNER_ONLY_CONTENT_TYPES.any { type.contains(it) }
    }
}

internal fun HomeViewModel.filterTrending(
    items: List<CultureTrendingItem>,
): List<CultureTrendingItem> {
    if (ownerMode) return items
    return items.filter { item ->
        val type = item.type?.lowercase() ?: return@filter true
        !OWNER_ONLY_CONTENT_TYPES.any { type.contains(it) }
    }
}

internal fun HomeViewModel.filterSectionContent(
    items: List<SectionContentItem>,
): List<SectionContentItem> {
    if (ownerMode) return items
    return items.filter { item ->
        val type = item.type?.lowercase() ?: return@filter true
        !OWNER_ONLY_CONTENT_TYPES.any { type.contains(it) }
    }
}
