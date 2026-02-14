package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface LLMSearchRepository {
    suspend fun semanticSearch(query: String): BayitResult<List<Any>>
    suspend fun getSearchSuggestions(partialQuery: String): BayitResult<List<String>>
    suspend fun askQuestion(question: String, contextMediaId: String?): BayitResult<Any>
    suspend fun getSearchHistory(): BayitResult<List<Any>>
    suspend fun clearSearchHistory(): BayitResult<Unit>
}
