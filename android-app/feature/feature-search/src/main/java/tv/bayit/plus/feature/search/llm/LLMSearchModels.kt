package tv.bayit.plus.feature.search.llm

data class LLMSearchUiState(
    val query: String = "",
    val results: List<LLMResultItem> = emptyList(),
    val suggestions: List<String> = emptyList(),
    val historyEntries: List<HistoryEntry> = emptyList(),
    val answer: String? = null,
    val isSearching: Boolean = false,
    val isAskingQuestion: Boolean = false,
    val errorMessage: String? = null,
)

data class LLMResultItem(
    val id: String,
    val title: String,
    val description: String,
    val thumbnail: String?,
    val type: String?,
    val relevanceExplanation: String?,
) {
    companion object {
        fun fromApiResponse(item: Any): LLMResultItem {
            val map = item as? Map<*, *>
            return LLMResultItem(
                id = map?.get("id")?.toString().orEmpty(),
                title = map?.get("title")?.toString().orEmpty(),
                description = map?.get("description")?.toString().orEmpty(),
                thumbnail = map?.get("thumbnail")?.toString(),
                type = map?.get("type")?.toString(),
                relevanceExplanation = map?.get("relevance_explanation")?.toString(),
            )
        }
    }
}

data class HistoryEntry(
    val query: String,
    val searchedAt: String?,
) {
    companion object {
        fun fromApiResponse(item: Any): HistoryEntry {
            val map = item as? Map<*, *>
            return HistoryEntry(
                query = map?.get("query")?.toString().orEmpty(),
                searchedAt = map?.get("searched_at")?.toString(),
            )
        }
    }
}
