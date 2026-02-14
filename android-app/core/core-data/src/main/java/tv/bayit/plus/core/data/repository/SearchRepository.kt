package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface SearchRepository {
    suspend fun search(query: String, filters: Map<String, String>?): BayitResult<List<Any>>
    suspend fun getSuggestions(partialQuery: String): BayitResult<List<String>>
    suspend fun getRecentSearches(): BayitResult<List<String>>
    suspend fun clearRecentSearches(): BayitResult<Unit>
    suspend fun getPopularSearches(): BayitResult<List<String>>
}
